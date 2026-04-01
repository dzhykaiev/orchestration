import type { AgentRole } from "@orchestration/shared";
import { resolveCompanyProjectRoot } from "../../runtime/company-paths.js";
import type {
  ImplementationDependencies,
  ImplementationJobData,
  ImplementationJobHandler,
} from "./ports.js";

const MAX_RETRY_DELAY_MS = 120_000;

export function createImplementationJobHandler(
  deps: ImplementationDependencies,
): ImplementationJobHandler {
  return async (job: { data: ImplementationJobData }) => {
    const { taskId, workstreamId, projectId, role, prompt, provider, sessionId } = job.data;
    console.log(
      `[Implementation] ${role} agent (${provider || "default"}) task ${taskId} | workstream ${workstreamId}`,
    );

    const projectCheck = await deps.projectRepo.getProjectById(projectId);
    if (projectCheck && (projectCheck.status === "cancelled" || projectCheck.status === "failed")) {
      console.warn(
        `[Implementation] Skipping task ${taskId} — project ${projectId} is ${projectCheck.status}`,
      );
      try {
        await deps.taskRepo.markTaskFailed(taskId, `Skipped: project is ${projectCheck.status}`);
      } catch {
        // Task may already be in a terminal state.
      }
      return;
    }

    try {
      await deps.taskRepo.markTaskStarted(taskId);
    } catch (err) {
      console.warn(
        `[Implementation] Skipping task ${taskId}: ${err instanceof Error ? err.message : err}`,
      );
      return;
    }
    deps.eventBus.emitTyped("task.started", { taskId, projectId });

    try {
      await deps.auditLogRepo.createAuditLog({
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

    const project = await deps.projectRepo.getProjectById(projectId);
    const projectDir = project ? resolveCompanyProjectRoot(project.workspaceId, projectId) : "";
    let newSessionId: string | undefined;

    try {
      const workstream = await deps.workstreamRepo.getWorkstreamById(workstreamId);
      if (!project || !workstream) {
        throw new Error(`Project ${projectId} or workstream ${workstreamId} not found`);
      }

      const llmProvider = deps.createLLMProvider(role, provider);
      const filesBefore = await deps.snapshotFiles(projectDir);

      let customBrief: string | undefined;
      let capabilities: string[] | undefined;
      try {
        if (project.workspaceId) {
          const agentDef = await deps.agentDefinitionRepo.getByRole(project.workspaceId, role);
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

      const systemPrompt = deps.buildSystemPrompt(role as AgentRole, project.architecture || "", {
        customBrief,
        capabilities,
      });

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

      const filesAfter = await deps.snapshotFiles(projectDir);
      const newOrModified = deps
        .diffSnapshots(filesBefore, filesAfter)
        .map((file) => file.replace(`${projectDir}/`, ""));

      console.log(
        `[Implementation] ${role} agent created/modified ${newOrModified.length} files:`,
        newOrModified.slice(0, 10),
      );

      try {
        const escalated = await deps.handleEscalation(taskId, projectId, result || "");
        if (escalated) {
          console.log(`[Implementation] Task ${taskId} escalated to parent tier`);
        }
      } catch (err) {
        console.warn(`[Implementation] Escalation handling failed for task ${taskId}:`, err);
      }

      await deps.taskRepo.markTaskCompleted(taskId, result || "", newOrModified, costUsd);
      deps.eventBus.emitTyped("task.completed", { taskId, projectId, filesModified: newOrModified });

      try {
        await deps.auditLogRepo.createAuditLog({
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

      if (newOrModified.length > 0) {
        try {
          await deps.artifactRepo.createArtifact({
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

      if (result) {
        try {
          await deps.artifactRepo.createArtifact({
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

      if (role === "reviewer" && result) {
        try {
          await deps.handleReviewerOutput(taskId, workstreamId, projectId, result);
        } catch (err) {
          console.warn(`[Implementation] Review handling failed for task ${taskId}:`, err);
        }
      }

      if (role === "lead") {
        try {
          const delegation = await deps.handleDelegation({
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
            return;
          }
        } catch (err) {
          console.warn(`[Implementation] Delegation handling failed for task ${taskId}:`, err);
        }
      }

      await deps.checkWorkstreamCompletion(workstreamId, projectId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Implementation] Task ${taskId} failed:`, errorMessage);

      try {
        await deps.taskRepo.markTaskFailed(taskId, errorMessage);
      } catch (markErr) {
        console.error(`[Implementation] Failed to mark task ${taskId} as failed:`, markErr);
      }
      deps.eventBus.emitTyped("task.failed", { taskId, projectId, error: errorMessage });

      try {
        await deps.auditLogRepo.createAuditLog({
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

      let retried = false;
      try {
        const task = await deps.taskRepo.getTaskById(taskId);
        if (task && task.attempts < task.maxAttempts) {
          await deps.taskRepo.retryTask(taskId);
          const delay = Math.min(5000 * task.attempts * task.attempts, MAX_RETRY_DELAY_MS);
          console.log(
            `[Implementation] Retrying task ${taskId} (attempt ${task.attempts + 1}/${task.maxAttempts}) in ${delay}ms`,
          );

          const retryPrompt = `${prompt}\n\n---\nPrevious attempt failed with error: ${errorMessage}\nPlease fix the issue and try again.`;
          const resumeSessionId = newSessionId || sessionId;

          await deps.implementationQueue.add(
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
        try {
          await deps.checkWorkstreamCompletion(workstreamId, projectId);
        } catch (checkErr) {
          console.error("[Implementation] Failed to check workstream completion:", checkErr);
        }
      }
    }
  };
}
