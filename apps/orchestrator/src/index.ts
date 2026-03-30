import { client as dbClient } from "@orchestration/db";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { eventBus } from "./events/emitter.js";
import { closeSharedResources } from "./shared-resources.js";
import { handleImplementationJob } from "./workers/implementation.js";
import { handlePlanningJob } from "./workers/planning.js";
import { handleValidationJob } from "./workers/validation.js";

const connection = new IORedis.default(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

async function main() {
  console.log("[Orchestrator] Starting workers...");

  const planningWorker = new Worker("planning", handlePlanningJob, {
    connection,
    concurrency: 1, // Plan one project at a time
  });

  const implementationWorker = new Worker("implementation", handleImplementationJob, {
    connection,
    concurrency: 3, // Run up to 3 agent tasks in parallel
  });

  const validationWorker = new Worker("validation", handleValidationJob, {
    connection,
    concurrency: 2, // Validate up to 2 workstreams in parallel
  });

  // Log completed jobs
  planningWorker.on("completed", (job) => {
    console.log(`[Planning] Job ${job.id} completed`);
  });

  implementationWorker.on("completed", (job) => {
    console.log(`[Implementation] Job ${job.id} completed`);
  });

  validationWorker.on("completed", (job) => {
    console.log(`[Validation] Job ${job.id} completed`);
  });

  // Log failed jobs
  planningWorker.on("failed", (job, err) => {
    console.error(`[Planning] Job ${job?.id} failed:`, err.message);
  });

  implementationWorker.on("failed", (job, err) => {
    console.error(`[Implementation] Job ${job?.id} failed:`, err.message);
  });

  validationWorker.on("failed", (job, err) => {
    console.error(`[Validation] Job ${job?.id} failed:`, err.message);
  });

  // IMPORTANT: Listen to worker error events to prevent unhandled exceptions
  // BullMQ workers emit 'error' for connection issues, stalled jobs, etc.
  planningWorker.on("error", (err) => {
    console.error("[Planning] Worker error:", err.message);
  });

  implementationWorker.on("error", (err) => {
    console.error("[Implementation] Worker error:", err.message);
  });

  validationWorker.on("error", (err) => {
    console.error("[Validation] Worker error:", err.message);
  });

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
      console.log("[Orchestrator] Closing workers...");
      await Promise.allSettled([
        planningWorker.close(),
        implementationWorker.close(),
        validationWorker.close(),
      ]);
      console.log("[Orchestrator] Closing shared queues and connections...");
      await closeSharedResources();
      console.log("[Orchestrator] Closing event bus...");
      await eventBus.close();
      console.log("[Orchestrator] Closing main Redis connection...");
      await connection.quit();
      console.log("[Orchestrator] Closing database connection...");
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

  // Catch unhandled promise rejections to prevent silent crashes
  process.on("unhandledRejection", (reason) => {
    console.error("[Orchestrator] Unhandled rejection:", reason);
  });

  console.log("[Orchestrator] Workers started.");
}

main().catch((err) => {
  console.error("[Orchestrator] Failed to start:", err);
  process.exit(1);
});
