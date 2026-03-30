import {
  EVENTS_CHANNEL,
  type EventPayload,
  type EventType,
  type OrchestratorEvent,
} from "@orchestration/shared";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const CHANNEL = EVENTS_CHANNEL;

class EventBus {
  private publisher: IORedis.default;
  private ownsConnection: boolean;

  constructor(connection?: IORedis.default) {
    this.ownsConnection = !connection;
    this.publisher =
      connection ??
      new IORedis.default(REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: false });
  }

  emit(event: OrchestratorEvent): void {
    if (this.publisher.status !== "ready") {
      console.warn(
        `[EventBus] Skipping event ${event.type} — Redis not ready (status: ${this.publisher.status})`,
      );
      return;
    }
    this.publisher.publish(CHANNEL, JSON.stringify(event)).catch((err) => {
      console.error(`[EventBus] Failed to publish ${event.type}:`, err.message);
    });
  }

  emitTyped<T extends EventType>(type: T, payload: EventPayload<T>): void {
    this.emit({ type, payload } as OrchestratorEvent);
  }

  async close(): Promise<void> {
    if (this.ownsConnection) {
      await this.publisher.quit();
    }
  }
}

export const eventBus = new EventBus();
export { EventBus, CHANNEL };
