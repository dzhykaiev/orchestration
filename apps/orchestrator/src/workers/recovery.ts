import { projectRepo, taskRepo } from "@orchestration/db";
import type { ProjectStatus } from "@orchestration/shared";
import { PROJECT_TRANSITIONS, canTransition } from "@orchestration/shared";
import { implementationQueue } from "../shared-resources.js";

/** Stale thresholds (minutes) */
const STALE_PLANNING_MINUTES = 10;
const STALE_QUEUED_MINUTES = 5;
const STALE_RUNNING_MINUTES = 30;

/**
 * Recovery job that detects and recovers stale/orphaned work items.
 * Designed to be called periodically (e.g. every 2 minutes via setInterval).
 * Each recovery step is wrapped in try/catch so one failure doesn't block others.
 */
export async function handleRecoveryJob(): Promise<void> {
  console.log("[Recovery] Starting recovery check...");

  // 1. Find projects stuck in "planning" for > 10 minutes
  try {
    const staleProjects = await projectRepo.findStaleProjects("planning", STALE_PLANNING_MINUTES);

    for (const project of staleProjects) {
      try {
        if (!canTransition(PROJECT_TRANSITIONS, project.status as ProjectStatus, "draft")) {
          console.warn(
            `[Recovery] Cannot transition project ${project.id} from ${project.status} to draft, skipping`,
          );
          continue;
        }

        await projectRepo.updateProject(project.id, { status: "draft" });
        console.warn(
          `[Recovery] Project ${project.id} was stuck in "planning" for >${STALE_PLANNING_MINUTES}min — reset to "draft"`,
        );
      } catch (err) {
        console.error(`[Recovery] Failed to reset stale project ${project.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[Recovery] Failed to check stale planning projects:", err);
  }

  // 2. Find tasks stuck in "queued" for > 5 minutes — re-enqueue
  try {
    const staleTasks = await taskRepo.findStaleTasks("queued", STALE_QUEUED_MINUTES);

    for (const task of staleTasks) {
      try {
        console.warn(
          `[Recovery] Task ${task.id} stuck in "queued" for >${STALE_QUEUED_MINUTES}min — re-enqueuing`,
        );
        await implementationQueue.add("implement", {
          taskId: task.id,
          workstreamId: task.workstreamId,
          projectId: task.projectId,
          role: task.role,
          prompt: task.prompt,
        });
      } catch (err) {
        console.error(`[Recovery] Failed to re-enqueue stale task ${task.id}:`, err);
      }
    }
  } catch (err) {
    console.error("[Recovery] Failed to check stale queued tasks:", err);
  }

  // 3. Find tasks stuck in "running" for > 30 minutes
  try {
    const stuckTasks = await taskRepo.findStaleTasks("running", STALE_RUNNING_MINUTES);

    for (const task of stuckTasks) {
      try {
        await taskRepo.markTaskFailed(
          task.id,
          `Task timed out after >${STALE_RUNNING_MINUTES} minutes`,
        );
        console.warn(
          `[Recovery] Task ${task.id} stuck in "running" for >${STALE_RUNNING_MINUTES}min — marked as failed`,
        );

        // Retry if attempts < maxAttempts
        if (task.attempts < task.maxAttempts) {
          await taskRepo.retryTask(task.id);
          await implementationQueue.add("implement", {
            taskId: task.id,
            workstreamId: task.workstreamId,
            projectId: task.projectId,
            role: task.role,
            prompt: `${task.prompt}\n\n---\nPrevious attempt timed out. Please try again.`,
          });
          console.log(
            `[Recovery] Re-enqueued timed-out task ${task.id} (attempt ${task.attempts + 1}/${task.maxAttempts})`,
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
