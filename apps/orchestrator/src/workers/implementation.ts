import { resolve } from "node:path";
import {
  agentDefinitionRepo,
  artifactRepo,
  auditLogRepo,
  projectRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import type { AgentRole } from "@orchestration/shared";
import type { Job } from "bullmq";
import { handleDelegation } from "../delegation/handler.js";
import { handleEscalation } from "../escalation/handler.js";
import { eventBus } from "../events/index.js";
import { diffSnapshots, snapshotFiles } from "../llm/file-utils.js";
import { createLLMProvider } from "../llm/index.js";
import { buildSystemPrompt } from "../prompts/implementation.js";
import { implementationQueue } from "../shared-resources.js";
import { checkWorkstreamCompletion, handleReviewerOutput } from "../tracking/progress.js";

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

  // 0. Check project status — skip execution if project is cancelled or failed
  const projectCheck = await projectRepo.getProjectById(projectId);
  if (projectCheck && (projectCheck.status === "cancelled" || projectCheck.status === "failed")) {
    console.warn(
      `[Implementation] Skipping task ${taskId} — project ${projectId} is ${projectCheck.status}`,
    );
    try {
      await taskRepo.markTaskFailed(taskId, `Skipped: project is ${projectCheck.status}`);
    } catch {
      // Task may already be in a terminal state
    }
    return;
  }

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

  // Audit: task started
  try {
    await auditLogRepo.createAuditLog({
      projectId,
      entityType: "task",
      entityId: taskId,
      action: "status_changed",
      actorType: "agent",
      actorId: role,
      metadata: { from: "queued", to: "running" },
    });
  } catch (err) {
    console.warn("[Implementation] Failed to create audit log for task start:", err);
  }

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

    // 5. Build system prompt based on role, with optional workspace agent definition
    let customBrief: string | undefined;
    let capabilities: string[] | undefined;
    try {
      if (project.workspaceId) {
        const agentDef = await agentDefinitionRepo.getByRole(project.workspaceId, role);
        if (agentDef) {
          if (agentDef.systemPrompt) {
            customBrief = agentDef.systemPrompt;
          }
          if (agentDef.capabilities && agentDef.capabilities.length > 0) {
            capabilities = agentDef.capabilities;
          }
        }
      }
    } catch (err) {
      console.warn(
        `[Implementation] Failed to load agent definition for role ${role}:`,
        err instanceof Error ? err.message : err,
      );
    }
    const systemPrompt = buildSystemPrompt(role as AgentRole, project.architecture || "", {
      customBrief,
      capabilities,
    });

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

    // 8. Check for escalation signals before marking complete
    try {
      const escalated = await handleEscalation(taskId, projectId, result || "");
      if (escalated) {
        console.log(`[Implementation] Task ${taskId} escalated to parent tier`);
      }
    } catch (err) {
      console.warn(`[Implementation] Escalation handling failed for task ${taskId}:`, err);
    }

    // 9. Mark task completed
    await taskRepo.markTaskCompleted(taskId, result || "", newOrModified, costUsd);
    eventBus.emitTyped("task.completed", { taskId, filesModified: newOrModified });

    // 9b. Audit: task completed
    try {
      await auditLogRepo.createAuditLog({
        projectId,
        entityType: "task",
        entityId: taskId,
        action: "completed",
        actorType: "agent",
        actorId: role,
        metadata: { filesModified: newOrModified.length, costUsd },
      });
    } catch (err) {
      console.warn("[Implementation] Failed to create audit log for task completion:", err);
    }

    // 9c. Artifact: code diff (file changes)
    if (newOrModified.length > 0) {
      try {
        await artifactRepo.createArtifact({
          projectId,
          taskId,
          workstreamId,
          type: "code_diff",
          name: `Task ${taskId} Changes`,
          content: JSON.stringify(newOrModified),
          metadata: { fileCount: newOrModified.length },
        });
      } catch (err) {
        console.warn("[Implementation] Failed to create code_diff artifact:", err);
      }
    }

    // 9d. Artifact: agent output log
    if (result) {
      try {
        await artifactRepo.createArtifact({
          projectId,
          taskId,
          workstreamId,
          type: "log",
          name: `Agent Output - ${role}`,
          content: result,
        });
      } catch (err) {
        console.warn("[Implementation] Failed to create agent output artifact:", err);
      }
    }

    // 10. For reviewer roles, parse verdict and create review record
    if (role === "reviewer" && result) {
      try {
        await handleReviewerOutput(taskId, workstreamId, projectId, result);
      } catch (err) {
        console.warn(`[Implementation] Review handling failed for task ${taskId}:`, err);
      }
    }

    // 11. For lead roles, check for delegation patterns
    if (role === "lead") {
      try {
        const delegation = await handleDelegation({
          taskId,
          projectId,
          workstreamId,
          output: result || "",
          provider,
        });
        if (delegation.delegated) {
          console.log(
            `[Implementation] Lead task ${taskId} delegated ${delegation.childTaskIds.length} child tasks`,
          );
          // Don't check workstream completion yet — child tasks need to finish first
          return;
        }
      } catch (err) {
        console.warn(`[Implementation] Delegation handling failed for task ${taskId}:`, err);
      }
    }

    // 12. Check workstream completion and unblock dependents
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

    // Audit: task failed
    try {
      await auditLogRepo.createAuditLog({
        projectId,
        entityType: "task",
        entityId: taskId,
        action: "failed",
        actorType: "agent",
        actorId: role,
        metadata: { error: errorMessage },
      });
    } catch (auditErr) {
      console.warn("[Implementation] Failed to create audit log for task failure:", auditErr);
    }

    // Retry with exponential backoff if attempts left
    let retried = false;
    try {
      const task = await taskRepo.getTaskById(taskId);
      if (task && task.attempts < task.maxAttempts) {
        // Reset task to queued state and clear error
        await taskRepo.retryTask(taskId);

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
          { delay, jobId: `retry-${taskId}-${task.attempts + 1}` },
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
