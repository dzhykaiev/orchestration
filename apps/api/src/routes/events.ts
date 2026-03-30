import type { FastifyPluginAsync } from "fastify";
import IORedis from "ioredis";
import type { OrchestratorEvent } from "@orchestration/shared";
import { EVENTS_CHANNEL } from "../events/channel.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const HEARTBEAT_INTERVAL_MS = 15_000;

export const eventRoutes: FastifyPluginAsync = async (app) => {
  app.get("/", async (request, reply) => {
    const projectId = (request.query as Record<string, string>)?.projectId;

    const subscriber = new IORedis.default(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

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
      subscriber.unsubscribe(EVENTS_CHANNEL).catch(() => {});
      subscriber.disconnect();
    };

    request.raw.on("close", cleanup);

    subscriber.on("message", (_channel: string, message: string) => {
      try {
        const event: OrchestratorEvent = JSON.parse(message);

        if (projectId && event.payload && "projectId" in event.payload) {
          if (event.payload.projectId !== projectId) return;
        }

        const id = Date.now();
        reply.raw.write(`id: ${id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.payload)}\n\n`);
      } catch (err) {
        app.log.error({ err }, "Failed to process SSE event");
      }
    });

    subscriber.on("error", (err) => {
      app.log.error({ err }, "Redis subscriber error");
    });

    await subscriber.subscribe(EVENTS_CHANNEL);
  });
};
