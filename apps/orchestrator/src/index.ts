import { startOrchestrator } from "./infrastructure/bootstrap/start-orchestrator.js";

startOrchestrator().catch((err) => {
  console.error("[Orchestrator] Failed to start:", err);
  process.exit(1);
});
