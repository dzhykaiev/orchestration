import { randomUUID } from "node:crypto";
import type { OrchestratorEvent } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import IORedis from "ioredis";
import { z } from "zod";
import { EVENTS_CHANNEL } from "../events/channel.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const HEARTBEAT_INTERVAL_MS = 15_000;

const eventQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
});

interface SSEClient {
  projectId?: string;
  write: (data: string) => void;
}

function extractProjectId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const value = (payload as Record<string, unknown>).projectId;
  return typeof value === "string" ? value : undefined;
}

class SSEHub {
  private subscriber: IORedis.default;
  private clients = new Map<string, SSEClient>();

  constructor(redisUrl: string) {
    this.subscriber = new IORedis.default(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    this.subscriber.subscribe(EVENTS_CHANNEL).catch((err) => {
      console.error("[SSEHub] Failed to subscribe:", err);
    });
    this.subscriber.on("message", (_channel: string, message: string) => {
      this.broadcast(message);
    });
    this.subscriber.on("error", (err) => {
      console.error("[SSEHub] Redis subscriber error:", err);
    });
  }

  private broadcast(message: string) {
    try {
      const event: OrchestratorEvent = JSON.parse(message);

      for (const [, client] of this.clients) {
        if (client.projectId) {
          const payloadProjectId = extractProjectId(event.payload);
          if (!payloadProjectId || payloadProjectId !== client.projectId) {
            continue;
          }
        }
        client.write(
          `id: ${Date.now()}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`,
        );
      }
    } catch (err) {
      console.error("[SSEHub] Failed to process event:", err);
    }
  }

  addClient(id: string, projectId: string | undefined, write: (data: string) => void) {
    this.clients.set(id, { projectId, write });
  }

  removeClient(id: string) {
    this.clients.delete(id);
  }

  async close() {
    await this.subscriber.unsubscribe(EVENTS_CHANNEL).catch(() => {});
    this.subscriber.disconnect();
    this.clients.clear();
  }
}

let hub: SSEHub | null = null;

function getHub(): SSEHub {
  if (!hub) {
    hub = new SSEHub(REDIS_URL);
  }
  return hub;
}

export const eventRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("onClose", async () => {
    if (hub) {
      await hub.close();
      hub = null;
    }
  });

  app.get("/", async (request, reply) => {
    const { projectId } = eventQuerySchema.parse(request.query);
    const clientId = randomUUID();
    const sseHub = getHub();

    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });

    const heartbeat = setInterval(() => {
      reply.raw.write(": heartbeat\n\n");
    }, HEARTBEAT_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(heartbeat);
      sseHub.removeClient(clientId);
    };

    request.raw.on("close", cleanup);

    sseHub.addClient(clientId, projectId, (data: string) => {
      reply.raw.write(data);
    });
  });
};
