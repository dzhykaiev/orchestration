import Fastify from "fastify";
import cors from "@fastify/cors";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { projectRoutes } from "./routes/projects.js";
import { workstreamRoutes } from "./routes/workstreams.js";
import { taskRoutes } from "./routes/tasks.js";
import { eventRoutes } from "./routes/events.js";
import { fileRoutes } from "./routes/files.js";
import { client as dbClient } from "@orchestration/db";

const PORT = parseInt(process.env.PORT || "3001", 10);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(errorHandlerPlugin);

  // Register routes
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(workstreamRoutes, { prefix: "/api/workstreams" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  await app.register(eventRoutes, { prefix: "/api/events" });
  await app.register(fileRoutes, { prefix: "/api/projects" });

  // Health check
  app.get("/health", async () => ({ status: "ok" }));

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("Shutting down gracefully...");

    const forceTimeout = setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);

    try {
      await app.close();
      await dbClient.end();
      clearTimeout(forceTimeout);
      console.log("Shutdown complete");
      process.exit(0);
    } catch (err) {
      clearTimeout(forceTimeout);
      console.error("Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API server running on port ${PORT}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
