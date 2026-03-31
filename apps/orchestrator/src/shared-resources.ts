import { Queue } from "bullmq";
import IORedis from "ioredis";

/**
 * Shared Redis connection and BullMQ queues for workers.
 * Centralizes resource management so everything can be properly closed on shutdown.
 */

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

export const sharedConnection = new IORedis.default(REDIS_URL, {
  maxRetriesPerRequest: null,
});

export const planningQueue = new Queue("planning", { connection: sharedConnection });
export const implementationQueue = new Queue("implementation", { connection: sharedConnection });
export const validationQueue = new Queue("validation", { connection: sharedConnection });

/**
 * Close all shared queues and the underlying Redis connection.
 * Call this during graceful shutdown.
 */
export async function closeSharedResources(): Promise<void> {
  await Promise.allSettled([
    planningQueue.close(),
    implementationQueue.close(),
    validationQueue.close(),
  ]);
  await sharedConnection.quit();
}
