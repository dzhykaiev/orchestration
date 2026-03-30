import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { databasePlugin } from "./plugins/database.js";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { redisPlugin } from "./plugins/redis.js";
import { eventRoutes } from "./routes/events.js";
import { featureRoutes } from "./routes/features.js";
import { fileRoutes } from "./routes/files.js";
import { projectRoutes } from "./routes/projects.js";
import { taskRoutes } from "./routes/tasks.js";
import { workstreamRoutes } from "./routes/workstreams.js";

export interface AppOptions {
  logger?: boolean | object;
  /** Skip Redis/BullMQ plugin registration (useful for testing) */
  skipRedis?: boolean;
  /** Skip database plugin registration (useful for testing) */
  skipDatabase?: boolean;
}

export async function buildApp(opts: AppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ?? true,
  });

  // Core plugins
  await app.register(cors, { origin: true });
  await app.register(errorHandlerPlugin);

  if (!opts.skipDatabase) {
    await app.register(databasePlugin);
  }

  if (!opts.skipRedis) {
    await app.register(redisPlugin);
  }

  // Routes
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(workstreamRoutes, { prefix: "/api/workstreams" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  await app.register(eventRoutes, { prefix: "/api/events" });
  await app.register(fileRoutes, { prefix: "/api/projects" });
  await app.register(featureRoutes, { prefix: "/api/features" });

  // Health check
  app.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  return app;
}
