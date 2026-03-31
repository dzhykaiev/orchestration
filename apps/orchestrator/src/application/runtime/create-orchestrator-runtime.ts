import { Queue, Worker } from "bullmq";
import {
  handleImplementationJob,
  handlePlanningJob,
  handleRecoveryJob,
  handleValidationJob,
} from "../../interfaces/workers/handlers.js";
import { sharedConnection } from "../../shared-resources.js";

const JOB_REMOVE_AGE_MS = 24 * 60 * 60 * 1000;
const RECOVERY_INTERVAL_MS = 2 * 60 * 1000;

export interface OrchestratorRuntime {
  stop: () => Promise<void>;
}

export function createOrchestratorRuntime(): OrchestratorRuntime {
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

  const recoveryInterval = setInterval(() => {
    handleRecoveryJob().catch((err) => {
      console.error("[Recovery] Unhandled error in recovery job:", err);
    });
  }, RECOVERY_INTERVAL_MS);
  console.log("[Orchestrator] Recovery job scheduled (every 2 minutes).");

  return {
    async stop() {
      clearInterval(recoveryInterval);
      await Promise.allSettled([
        planningWorker.close(),
        implementationWorker.close(),
        validationWorker.close(),
      ]);
      await Promise.allSettled([planningQ.close(), implQ.close(), validationQ.close()]);
    },
  };
}
