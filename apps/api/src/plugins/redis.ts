import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import IORedis from "ioredis";
import { Queue } from "bullmq";

declare module "fastify" {
  interface FastifyInstance {
    redis: InstanceType<typeof IORedis.default>;
    queues: {
      planning: Queue;
      implementation: Queue;
      validation: Queue;
    };
  }
}

const redisPluginImpl: FastifyPluginAsync = async (app) => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

  const redis = new IORedis.default(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  const connection = new IORedis.default(redisUrl, {
    maxRetriesPerRequest: null,
  });

  const planningQueue = new Queue("planning", { connection });
  const implementationQueue = new Queue("implementation", { connection });
  const validationQueue = new Queue("validation", { connection });

  app.decorate("redis", redis);
  app.decorate("queues", {
    planning: planningQueue,
    implementation: implementationQueue,
    validation: validationQueue,
  });

  app.addHook("onClose", async () => {
    await planningQueue.close();
    await implementationQueue.close();
    await validationQueue.close();
    await redis.quit();
    await connection.quit();
  });
};

export const redisPlugin = fp(redisPluginImpl, {
  name: "redis",
});
