import { projectRepo, taskRepo } from "@orchestration/db";
import type { ProjectStatus } from "@orchestration/shared";
import { PROJECT_TRANSITIONS, canTransition } from "@orchestration/shared";
import { eventBus } from "../events/index.js";
import { implementationQueue } from "../shared-resources.js";

const STALE_PLANNING_MINUTES = 10;
const STALE_QUEUED_MINUTES = 5;
const STALE_RUNNING_MINUTES = 30;

export async function handleRecoveryJob(): Promise<void> {
  console.log("[Recovery] Starting recovery check...");

  // 1. Projects stuck in "planning" — transition to "failed" with diagnostic
  try {
    const staleProjects = await projectRepo.findStaleProjects("planning", STALE_PLANNING_MINUTES);

    for (const project of staleProjects) {
      try {
        if (!canTransition(PROJECT_TRANSITIONS, project.status as ProjectStatus, "failed")) {
          console.warn(
            `[Recovery] Cannot transition project ${project.id} from ${project.status} to failed, skipping`,
          );
          continue;
        }

        await projectRepo.updateProject(project.id, {
          status: "failed",
        });

        eventBus.emitTyped("project.failed", {
          projectId: project.id,
          error: `Planning job stalled for >${STALE_PLANNING_MINUTES}min`,
        });

        console.warn(
          `[Recovery] Project ${project.id} was stuck in "planning" for >${STALE_PLANNING_MINUTES}min — marked as failed`,
        );
      } catch (err) {
        console.error(`[Recovery] Failed to handle stale project ${project.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[Recovery] Failed to check stale planning projects:", err);
  }

  // 2. Tasks stuck in "queued" — re-enqueue with jobId to prevent duplicates
  try {
    const staleTasks = await taskRepo.findStaleTasks("queued", STALE_QUEUED_MINUTES);

    for (const task of staleTasks) {
      try {
        console.warn(
          `[Recovery] Task ${task.id} stuck in "queued" for >${STALE_QUEUED_MINUTES}min — re-enqueuing`,
        );
        await implementationQueue.add(
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

  // 3. Tasks stuck in "running" — mark failed, retry if attempts remain
  try {
    const stuckTasks = await taskRepo.findStaleTasks("running", STALE_RUNNING_MINUTES);

    for (const task of stuckTasks) {
      try {
        const taskWithAttempts = await taskRepo.getTaskById(task.id);
        if (!taskWithAttempts) continue;

        await taskRepo.markTaskFailed(
          task.id,
          `Task timed out after >${STALE_RUNNING_MINUTES} minutes`,
        );

        eventBus.emitTyped("task.failed", {
          taskId: task.id,
          error: `Timed out after >${STALE_RUNNING_MINUTES}min`,
        });

        console.warn(
          `[Recovery] Task ${task.id} stuck in "running" for >${STALE_RUNNING_MINUTES}min — marked as failed`,
        );

        if (taskWithAttempts.attempts < taskWithAttempts.maxAttempts) {
          await taskRepo.retryTask(task.id);

          await implementationQueue.add(
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
}
