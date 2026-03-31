import { client as dbClient } from "@orchestration/db";
import { Queue, Worker } from "bullmq";
import { eventBus } from "./events/emitter.js";
import { closeLockClient } from "./locking/index.js";
import { closeSharedResources, sharedConnection } from "./shared-resources.js";
import { handleImplementationJob } from "./workers/implementation.js";
import { handlePlanningJob } from "./workers/planning.js";
import { handleRecoveryJob } from "./workers/recovery.js";
import { handleValidationJob } from "./workers/validation.js";

const JOB_REMOVE_AGE_MS = 24 * 60 * 60 * 1000;

async function main() {
  console.log("[Orchestrator] Starting workers...");

  const planningQ = new Queue("planning", {
    connection: sharedConnection,
    defaultJobOptions: {
      removeOnComplete: { age: JOB_REMOVE_AGE_MS },
      removeOnFail: { age: JOB_REMOVE_AGE_MS },
      attempts: 3,
      backoff: { type: "exponential" as const, delay: 5000 },
    },
  });

  const implQ = new Queue("implementation", {
    connection: sharedConnection,
    defaultJobOptions: {
      removeOnComplete: { age: JOB_REMOVE_AGE_MS },
      removeOnFail: { age: JOB_REMOVE_AGE_MS },
      attempts: 1,
    },
  });

  const validationQ = new Queue("validation", {
    connection: sharedConnection,
    defaultJobOptions: {
      removeOnComplete: { age: JOB_REMOVE_AGE_MS },
      removeOnFail: { age: JOB_REMOVE_AGE_MS },
      attempts: 3,
      backoff: { type: "exponential" as const, delay: 5000 },
    },
  });

  const planningWorker = new Worker("planning", handlePlanningJob, {
    connection: sharedConnection,
    concurrency: 1,
  });

  const implementationWorker = new Worker("implementation", handleImplementationJob, {
    connection: sharedConnection,
    concurrency: 3,
  });

  const validationWorker = new Worker("validation", handleValidationJob, {
    connection: sharedConnection,
    concurrency: 2,
  });

  planningWorker.on("completed", (job) => {
    console.log(`[Planning] Job ${job.id} completed`);
  });

  implementationWorker.on("completed", (job) => {
    console.log(`[Implementation] Job ${job.id} completed`);
  });

  validationWorker.on("completed", (job) => {
    console.log(`[Validation] Job ${job.id} completed`);
  });

  planningWorker.on("failed", (job, err) => {
    console.error(`[Planning] Job ${job?.id} failed:`, err.message);
  });

  implementationWorker.on("failed", (job, err) => {
    console.error(`[Implementation] Job ${job?.id} failed:`, err.message);
  });

  validationWorker.on("failed", (job, err) => {
    console.error(`[Validation] Job ${job?.id} failed:`, err.message);
  });

  planningWorker.on("error", (err) => {
    console.error("[Planning] Worker error:", err.message);
  });

  implementationWorker.on("error", (err) => {
    console.error("[Implementation] Worker error:", err.message);
  });

  validationWorker.on("error", (err) => {
    console.error("[Validation] Worker error:", err.message);
  });

  const RECOVERY_INTERVAL_MS = 2 * 60 * 1000;
  const recoveryInterval = setInterval(() => {
    handleRecoveryJob().catch((err) => {
      console.error("[Recovery] Unhandled error in recovery job:", err);
    });
  }, RECOVERY_INTERVAL_MS);
  console.log("[Orchestrator] Recovery job scheduled (every 2 minutes).");

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
      clearInterval(recoveryInterval);
      await Promise.allSettled([
        planningWorker.close(),
        implementationWorker.close(),
        validationWorker.close(),
      ]);
      await Promise.allSettled([planningQ.close(), implQ.close(), validationQ.close()]);
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

main().catch((err) => {
  console.error("[Orchestrator] Failed to start:", err);
  process.exit(1);
});
