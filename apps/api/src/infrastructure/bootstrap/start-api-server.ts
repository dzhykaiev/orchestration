import { createApiApp } from "../../application/bootstrap/create-api-app.js";

const DEFAULT_PORT = 3001;

export async function startApiServer() {
  const port = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  const app = await createApiApp({ logger: true });

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

  await app.listen({ port, host: "0.0.0.0" });
  console.log(`API server running on port ${port}`);
}
