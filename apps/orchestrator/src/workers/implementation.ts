import { resolve } from "node:path";
import { projectRepo, taskRepo, workstreamRepo } from "@orchestration/db";
import type { AgentRole } from "@orchestration/shared";
import type { Job } from "bullmq";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { eventBus } from "../events/index.js";
import { diffSnapshots, snapshotFiles } from "../llm/file-utils.js";
import { createLLMProvider } from "../llm/index.js";
import { buildSystemPrompt } from "../prompts/implementation.js";
import { checkWorkstreamCompletion } from "../tracking/progress.js";

const connection = new IORedis.default(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const implementationQueue = new Queue("implementation", { connection });

const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

interface ImplementationJobData {
  taskId: string;
  workstreamId: string;
  projectId: string;
  role: string;
  prompt: string;
  provider?: string;
  sessionId?: string;
}

export async function handleImplementationJob(job: Job<ImplementationJobData>) {
  const { taskId, workstreamId, projectId, role, prompt, provider, sessionId } = job.data;
  console.log(`Running ${role} agent with ${provider || "default"} provider for task ${taskId}`);

  // 1. Mark task as started
  await taskRepo.markTaskStarted(taskId);
  eventBus.emitTyped("task.started", { taskId });

  // Project directory where agent works
  const projectDir = resolve(PROJECTS_DIR, projectId);
  let newSessionId: string | undefined;

  try {
    // 2. Load project for architecture context
    const project = await projectRepo.getProjectById(projectId);
    const workstream = await workstreamRepo.getWorkstreamById(workstreamId);

    if (!project || !workstream) {
      throw new Error(`Project ${projectId} or workstream ${workstreamId} not found`);
    }

    // 3. Create LLM provider for the role
    const llmProvider = createLLMProvider(role, provider);

    // 4. Snapshot files before (with mtimes to detect modifications)
    const filesBefore = await snapshotFiles(projectDir);

    // 5. Build system prompt based on role
    const systemPrompt = buildSystemPrompt(role as AgentRole, project.architecture || "");

    // 6. Run agent
    const runResult = await llmProvider.run({
      prompt,
      systemPrompt,
      cwd: projectDir,
      sessionId,
    });
    newSessionId = runResult.sessionId;
    const { result, costUsd } = runResult;

    console.log(`${role} agent finished task ${taskId}`);

    // 7. Diff files to find what was created/modified
    const filesAfter = await snapshotFiles(projectDir);
    const newOrModified = diffSnapshots(filesBefore, filesAfter).map((f) =>
      f.replace(`${projectDir}/`, ""),
    );

    console.log(
      `${role} agent created/modified ${newOrModified.length} files:`,
      newOrModified.slice(0, 10),
    );

    // 8. Mark task completed
    await taskRepo.markTaskCompleted(taskId, result, newOrModified, costUsd);
    eventBus.emitTyped("task.completed", { taskId, filesModified: newOrModified });

    // 9. Check workstream completion and unblock dependents
    await checkWorkstreamCompletion(workstreamId, projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Task ${taskId} failed:`, errorMessage);
    await taskRepo.markTaskFailed(taskId, errorMessage);
    eventBus.emitTyped("task.failed", { taskId, error: errorMessage });

    // Retry if attempts left
    const task = await taskRepo.getTaskById(taskId);
    if (task && task.attempts < task.maxAttempts) {
      const retryPrompt = `${prompt}\n\n---\nPrevious attempt failed with error: ${errorMessage}\nPlease fix the issue and try again.`;

      // Pass sessionId from previous run so opencode can resume the session
      const resumeSessionId = newSessionId || sessionId;

      await implementationQueue.add(
        "implement",
        {
          taskId,
          workstreamId,
          projectId,
          role,
          prompt: retryPrompt,
          provider,
          sessionId: resumeSessionId,
        },
        { delay: 5000 * task.attempts },
      );
    } else {
      await checkWorkstreamCompletion(workstreamId, projectId);
    }
  }
}
