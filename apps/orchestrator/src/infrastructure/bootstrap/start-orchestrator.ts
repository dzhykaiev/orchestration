import { client as dbClient } from "@orchestration/db";
import { createOrchestratorRuntime } from "../../application/runtime/create-orchestrator-runtime.js";
import { eventBus } from "../../events/emitter.js";
import { closeLockClient } from "../../locking/index.js";

export async function startOrchestrator() {
  console.log("[Orchestrator] Starting workers...");
  const runtime = createOrchestratorRuntime();

  let shuttingDown = false;
  const shutdown = async () => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log("[Orchestrator] Shutting down gracefully...");

    const forceTimeout = setTimeout(() => {
      console.error("[Orchestrator] Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);

    try {
      await runtime.stop();
      await eventBus.close();
      await closeLockClient();
      await dbClient.end();
      clearTimeout(forceTimeout);
      console.log("[Orchestrator] Shutdown complete");
      process.exit(0);
    } catch (err) {
      clearTimeout(forceTimeout);
      console.error("[Orchestrator] Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
  process.on("unhandledRejection", (reason) => {
    console.error("[Orchestrator] Unhandled rejection:", reason);
  });

  console.log("[Orchestrator] Workers started.");
}
