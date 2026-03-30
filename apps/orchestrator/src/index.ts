import { client as dbClient } from "@orchestration/db";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { handleImplementationJob } from "./workers/implementation.js";
import { handlePlanningJob } from "./workers/planning.js";
import { handleValidationJob } from "./workers/validation.js";

const connection = new IORedis.default(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

async function main() {
  console.log("Starting orchestrator workers...");

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

  planningWorker.on("completed", (job) => {
    console.log(`Planning job ${job.id} completed`);
  });

  implementationWorker.on("completed", (job) => {
    console.log(`Implementation job ${job.id} completed`);
  });

  validationWorker.on("completed", (job) => {
    console.log(`Validation job ${job.id} completed`);
  });

  planningWorker.on("failed", (job, err) => {
    console.error(`Planning job ${job?.id} failed:`, err);
  });

  implementationWorker.on("failed", (job, err) => {
    console.error(`Implementation job ${job?.id} failed:`, err);
  });

  validationWorker.on("failed", (job, err) => {
    console.error(`Validation job ${job?.id} failed:`, err);
  });

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
      console.log("Closing planning worker...");
      await planningWorker.close();
      console.log("Closing implementation worker...");
      await implementationWorker.close();
      console.log("Closing validation worker...");
      await validationWorker.close();
      console.log("Closing Redis connection...");
      await connection.quit();
      console.log("Closing database connection...");
      await dbClient.end();
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

  console.log("Orchestrator workers started.");
}

main().catch((err) => {
  console.error("Failed to start orchestrator:", err);
  process.exit(1);
});
