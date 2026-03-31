import type { RecoveryConfig, RecoveryDependencies } from "./ports.js";

const DEFAULT_CONFIG: RecoveryConfig = {
  stalePlanningMinutes: 10,
  staleQueuedMinutes: 5,
  staleRunningMinutes: 30,
};

export function createRecoveryJobHandler(
  deps: RecoveryDependencies,
  cfg: Partial<RecoveryConfig> = {},
): () => Promise<void> {
  const config: RecoveryConfig = { ...DEFAULT_CONFIG, ...cfg };

  return async () => {
    console.log("[Recovery] Starting recovery check...");

    try {
      const staleProjects = await deps.projectRepo.findStaleProjects(
        "planning",
        config.stalePlanningMinutes,
      );

      for (const project of staleProjects) {
        try {
          if (!deps.canProjectTransition(project.status, "failed")) {
            console.warn(
              `[Recovery] Cannot transition project ${project.id} from ${project.status} to failed, skipping`,
            );
            continue;
          }

          await deps.projectRepo.updateProject(project.id, { status: "failed" });
          deps.eventBus.emitTyped("project.failed", {
            projectId: project.id,
            error: `Planning job stalled for >${config.stalePlanningMinutes}min`,
          });

          console.warn(
            `[Recovery] Project ${project.id} was stuck in "planning" for >${config.stalePlanningMinutes}min — marked as failed`,
          );
        } catch (err) {
          console.error(`[Recovery] Failed to handle stale project ${project.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[Recovery] Failed to check stale planning projects:", err);
    }

    try {
      const staleTasks = await deps.taskRepo.findStaleTasks("queued", config.staleQueuedMinutes);

      for (const task of staleTasks) {
        try {
          console.warn(
            `[Recovery] Task ${task.id} stuck in "queued" for >${config.staleQueuedMinutes}min — re-enqueuing`,
          );
          await deps.implementationQueue.add(
            "implement",
            {
              taskId: task.id,
              workstreamId: task.workstreamId,
              projectId: task.projectId,
              role: task.role,
              prompt: task.prompt,
            },
            { jobId: `recovery-queued-${task.id}`, removeOnComplete: true },
          );
        } catch (err) {
          console.error(`[Recovery] Failed to re-enqueue stale task ${task.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[Recovery] Failed to check stale queued tasks:", err);
    }

    try {
      const stuckTasks = await deps.taskRepo.findStaleTasks("running", config.staleRunningMinutes);

      for (const task of stuckTasks) {
        try {
          const taskWithAttempts = await deps.taskRepo.getTaskById(task.id);
          if (!taskWithAttempts) {
            continue;
          }

          await deps.taskRepo.markTaskFailed(
            task.id,
            `Task timed out after >${config.staleRunningMinutes} minutes`,
          );

          deps.eventBus.emitTyped("task.failed", {
            taskId: task.id,
            error: `Timed out after >${config.staleRunningMinutes}min`,
          });

          console.warn(
            `[Recovery] Task ${task.id} stuck in "running" for >${config.staleRunningMinutes}min — marked as failed`,
          );

          if (taskWithAttempts.attempts < taskWithAttempts.maxAttempts) {
            await deps.taskRepo.retryTask(task.id);

            await deps.implementationQueue.add(
              "implement",
              {
                taskId: task.id,
                workstreamId: task.workstreamId,
                projectId: task.projectId,
                role: task.role,
                prompt: `${task.prompt}\n\n---\nPrevious attempt timed out. Please try again.`,
              },
              {
                jobId: `recovery-retry-${task.id}-${taskWithAttempts.attempts + 1}`,
                removeOnComplete: true,
              },
            );

            console.log(
              `[Recovery] Re-enqueued timed-out task ${task.id} (attempt ${taskWithAttempts.attempts + 1}/${taskWithAttempts.maxAttempts})`,
            );
          }
        } catch (err) {
          console.error(`[Recovery] Failed to handle stuck task ${task.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[Recovery] Failed to check stuck running tasks:", err);
    }

    console.log("[Recovery] Recovery check complete.");
  };
}
