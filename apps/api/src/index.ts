import { startApiServer } from "./infrastructure/bootstrap/start-api-server.js";

startApiServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
