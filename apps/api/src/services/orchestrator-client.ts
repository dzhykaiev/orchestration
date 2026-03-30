import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis(redisUrl);

// Queues for different orchestration stages
export const planningQueue = new Queue("planning", { connection });
export const implementationQueue = new Queue("implementation", { connection });
export const validationQueue = new Queue("validation", { connection });

// TODO: Add helper functions to enqueue planning and implementation tasks
