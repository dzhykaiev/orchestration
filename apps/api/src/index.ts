import Fastify from "fastify";
import cors from "@fastify/cors";
import { errorHandlerPlugin } from "./plugins/error-handler.js";
import { projectRoutes } from "./routes/projects.js";
import { workstreamRoutes } from "./routes/workstreams.js";
import { taskRoutes } from "./routes/tasks.js";

const PORT = parseInt(process.env.PORT || "3001", 10);

async function main() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(errorHandlerPlugin);

  // Register routes
  await app.register(projectRoutes, { prefix: "/api/projects" });
  await app.register(workstreamRoutes, { prefix: "/api/workstreams" });
  await app.register(taskRoutes, { prefix: "/api/tasks" });

  // Health check
  app.get("/health", async () => ({ status: "ok" }));

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API server running on port ${PORT}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
