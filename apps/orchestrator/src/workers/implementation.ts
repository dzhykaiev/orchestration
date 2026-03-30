import type { Job } from "bullmq";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { resolve } from "node:path";
import { runClaude, listFilesRecursive } from "../llm/claude.js";
import { buildSystemPrompt } from "../prompts/implementation.js";
import { checkWorkstreamCompletion } from "../tracking/progress.js";
import * as repo from "../db/repositories.js";
import type { AgentRole } from "@orchestration/shared";

const connection = new IORedis.default(process.env.REDIS_URL || "redis://localhost:6379");
const implementationQueue = new Queue("implementation", { connection });

const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

interface ImplementationJobData {
  taskId: string;
  workstreamId: string;
  projectId: string;
  role: string;
  prompt: string;
}

export async function handleImplementationJob(job: Job<ImplementationJobData>) {
  const { taskId, workstreamId, projectId, role, prompt } = job.data;
  console.log(`Running ${role} agent for task ${taskId}`);

  // 1. Mark task as started
  await repo.markTaskStarted(taskId);

  // Project directory where Claude works
  const projectDir = resolve(PROJECTS_DIR, projectId);

  try {
    // 2. Load project for architecture context
    const project = await repo.getProjectById(projectId);
    const workstream = await repo.getWorkstreamById(workstreamId);

    if (!project || !workstream) {
      throw new Error(`Project ${projectId} or workstream ${workstreamId} not found`);
    }

    // 3. Snapshot files before
    const filesBefore = new Set(await listFilesRecursive(projectDir));

    // 4. Build system prompt
    const systemPrompt = buildSystemPrompt(
      role as AgentRole,
      project.architecture || "",
    );

    // 5. Run Claude with full tool access in project directory
    const { result } = await runClaude({
      prompt,
      systemPrompt,
      cwd: projectDir,
    });

    console.log(`${role} agent finished task ${taskId}`);

    // 6. Diff files to find what was created/modified
    const filesAfter = await listFilesRecursive(projectDir);
    const newOrModified = filesAfter
      .filter((f) => !filesBefore.has(f))
      .map((f) => f.replace(projectDir + "/", ""));

    console.log(`${role} agent created/modified ${newOrModified.length} files:`, newOrModified.slice(0, 10));

    // 7. Mark task completed
    await repo.markTaskCompleted(taskId, result, newOrModified);

    // 8. Check workstream completion and unblock dependents
    await checkWorkstreamCompletion(workstreamId, projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Task ${taskId} failed:`, errorMessage);
    await repo.markTaskFailed(taskId, errorMessage);

    // Retry if attempts left
    const task = await repo.getTaskById(taskId);
    if (task && task.attempts < task.maxAttempts) {
      const retryPrompt = `${prompt}\n\n---\nPrevious attempt failed with error: ${errorMessage}\nPlease fix the issue and try again.`;

      await implementationQueue.add(
        "implement",
        { taskId, workstreamId, projectId, role, prompt: retryPrompt },
        { delay: 5000 * task.attempts },
      );
    } else {
      await checkWorkstreamCompletion(workstreamId, projectId);
    }
  }
}
