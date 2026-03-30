import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis.default(redisUrl);

export const planningQueue = new Queue("planning", { connection });
export const implementationQueue = new Queue("implementation", { connection });
export const validationQueue = new Queue("validation", { connection });
