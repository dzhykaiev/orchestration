import { createApiApp } from "../../application/bootstrap/create-api-app.js";
import { ticketAutoRunner } from "../../services/scheduler/ticket-auto-runner.js";

const DEFAULT_PORT = 3001;

export async function startApiServer() {
  const port = Number.parseInt(process.env.PORT || String(DEFAULT_PORT), 10);
  const autoRunnerEnabled =
    (process.env.AUTO_TICKET_RUNNER_ENABLED ?? "true").toLowerCase() !== "false";
  const app = await createApiApp({ logger: true });

  if (autoRunnerEnabled) {
    ticketAutoRunner.start(app.queues.planning);
    console.log("[TicketAutoRunner] Started autonomous ticket loop");
  }

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
      ticketAutoRunner.stop();
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
