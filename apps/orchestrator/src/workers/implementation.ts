import { resolve } from "node:path";
import { projectRepo, taskRepo, workstreamRepo } from "@orchestration/db";
import type { AgentRole } from "@orchestration/shared";
import type { Job } from "bullmq";
import { eventBus } from "../events/index.js";
import { diffSnapshots, snapshotFiles } from "../llm/file-utils.js";
import { createLLMProvider } from "../llm/index.js";
import { buildSystemPrompt } from "../prompts/implementation.js";
import { implementationQueue } from "../shared-resources.js";
import { checkWorkstreamCompletion } from "../tracking/progress.js";

const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

/** Max retry delay cap: 2 minutes */
const MAX_RETRY_DELAY_MS = 120_000;

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
  console.log(
    `[Implementation] ${role} agent (${provider || "default"}) task ${taskId} | workstream ${workstreamId}`,
  );

  // 1. Mark task as started (guarded: only from "queued" state)
  try {
    await taskRepo.markTaskStarted(taskId);
  } catch (err) {
    // Task is not in queued state — likely duplicate delivery, abort gracefully
    console.warn(
      `[Implementation] Skipping task ${taskId}: ${err instanceof Error ? err.message : err}`,
    );
    return;
  }
  eventBus.emitTyped("task.started", { taskId });

  // Project directory where agent works
  const project = await projectRepo.getProjectById(projectId);
  const projectDir = project?.repoPath
    ? resolve(project.repoPath)
    : resolve(PROJECTS_DIR, projectId);
  let newSessionId: string | undefined;

  try {
    // 2. Load workstream for context
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

    if (!result || result.trim().length === 0) {
      console.warn(`[Implementation] ${role} agent returned empty response for task ${taskId}`);
    }

    console.log(
      `[Implementation] ${role} agent finished task ${taskId}${costUsd ? ` ($${costUsd.toFixed(4)})` : ""}`,
    );

    // 7. Diff files to find what was created/modified
    const filesAfter = await snapshotFiles(projectDir);
    const newOrModified = diffSnapshots(filesBefore, filesAfter).map((f) =>
      f.replace(`${projectDir}/`, ""),
    );

    console.log(
      `[Implementation] ${role} agent created/modified ${newOrModified.length} files:`,
      newOrModified.slice(0, 10),
    );

    // 8. Mark task completed
    await taskRepo.markTaskCompleted(taskId, result || "", newOrModified, costUsd);
    eventBus.emitTyped("task.completed", { taskId, filesModified: newOrModified });

    // 9. Check workstream completion and unblock dependents
    await checkWorkstreamCompletion(workstreamId, projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Implementation] Task ${taskId} failed:`, errorMessage);

    try {
      await taskRepo.markTaskFailed(taskId, errorMessage);
    } catch (markErr) {
      console.error(`[Implementation] Failed to mark task ${taskId} as failed:`, markErr);
    }
    eventBus.emitTyped("task.failed", { taskId, error: errorMessage });

    // Retry with exponential backoff if attempts left
    let retried = false;
    try {
      const task = await taskRepo.getTaskById(taskId);
      if (task && task.attempts < task.maxAttempts) {
        // Exponential backoff: 5s, 20s, 45s, 80s... capped at MAX_RETRY_DELAY_MS
        const delay = Math.min(5000 * task.attempts * task.attempts, MAX_RETRY_DELAY_MS);
        console.log(
          `[Implementation] Retrying task ${taskId} (attempt ${task.attempts + 1}/${task.maxAttempts}) in ${delay}ms`,
        );

        const retryPrompt = `${prompt}\n\n---\nPrevious attempt failed with error: ${errorMessage}\nPlease fix the issue and try again.`;
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
          { delay },
        );
        retried = true;
      }
    } catch (retryErr) {
      console.error(`[Implementation] Failed to enqueue retry for task ${taskId}:`, retryErr);
    }

    if (!retried) {
      // No more retries — check if workstream should be marked failed
      try {
        await checkWorkstreamCompletion(workstreamId, projectId);
      } catch (checkErr) {
        console.error("[Implementation] Failed to check workstream completion:", checkErr);
      }
    }
  }
}
