import { buildApp } from "./app.js";

const PORT = Number.parseInt(process.env.PORT || "3001", 10);

async function main() {
  const app = await buildApp({ logger: true });

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

  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`API server running on port ${PORT}`);
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
