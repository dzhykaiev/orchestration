import {
  EVENTS_CHANNEL,
  type EventPayload,
  type EventType,
  type OrchestratorEvent,
} from "@orchestration/shared";
import IORedis from "ioredis";
import { persistEvent } from "./event-log.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CHANNEL = EVENTS_CHANNEL;
const MAX_BUFFER_SIZE = 100;

class EventBus {
  private publisher: IORedis.default;
  private ownsConnection: boolean;
  private buffer: string[] = [];
  private flushing = false;

  constructor(connection?: IORedis.default) {
    this.ownsConnection = !connection;
    this.publisher =
      connection ??
      new IORedis.default(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });

    this.publisher.on("ready", () => {
      this.flushBuffer();
    });
  }

  emit(event: OrchestratorEvent): void {
    const message = JSON.stringify(event);

    // Persist to DB for historical replay (fire-and-forget)
    persistEvent(event).catch((err) => {
      console.warn("[EventBus] Failed to persist event:", err);
    });

    if (this.publisher.status !== "ready") {
      if (this.buffer.length < MAX_BUFFER_SIZE) {
        this.buffer.push(message);
        console.warn(
          `[EventBus] Redis not ready — buffered event ${event.type} (${this.buffer.length}/${MAX_BUFFER_SIZE})`,
        );
      } else {
        console.error(`[EventBus] Buffer full (${MAX_BUFFER_SIZE}) — dropping event ${event.type}`);
      }
      return;
    }

    this.publisher.publish(CHANNEL, message).catch((err) => {
      console.error(`[EventBus] Failed to publish ${event.type}:`, err.message);
    });
  }

  emitTyped<T extends EventType>(type: T, payload: EventPayload<T>): void {
    this.emit({ type, payload } as OrchestratorEvent);
  }

  private async flushBuffer(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) return;
    this.flushing = true;

    const toFlush = [...this.buffer];
    this.buffer = [];

    console.log(`[EventBus] Flushing ${toFlush.length} buffered events`);

    for (const message of toFlush) {
      try {
        await this.publisher.publish(CHANNEL, message);
      } catch (err) {
        console.error("[EventBus] Failed to flush buffered event:", err);
      }
    }

    this.flushing = false;
  }

  async close(): Promise<void> {
    if (this.ownsConnection) {
      await this.publisher.quit();
    }
  }
}

export const eventBus = new EventBus();
export { EventBus, CHANNEL };
