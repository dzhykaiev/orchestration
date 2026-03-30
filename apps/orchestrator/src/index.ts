import { Worker } from "bullmq";
import IORedis from "ioredis";
import { handlePlanningJob } from "./workers/planning.js";
import { handleImplementationJob } from "./workers/implementation.js";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");

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

  planningWorker.on("completed", (job) => {
    console.log(`Planning job ${job.id} completed`);
  });

  implementationWorker.on("completed", (job) => {
    console.log(`Implementation job ${job.id} completed`);
  });

  planningWorker.on("failed", (job, err) => {
    console.error(`Planning job ${job?.id} failed:`, err);
  });

  implementationWorker.on("failed", (job, err) => {
    console.error(`Implementation job ${job?.id} failed:`, err);
  });

  console.log("Orchestrator workers started.");
}

main().catch((err) => {
  console.error("Failed to start orchestrator:", err);
  process.exit(1);
});
