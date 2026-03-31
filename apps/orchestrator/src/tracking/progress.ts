import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { featureRepo, projectRepo, taskRepo, workstreamRepo } from "@orchestration/db";
import type { AgentRole } from "@orchestration/shared";
import { eventBus } from "../events/index.js";
import { buildSystemPrompt, buildUserMessage } from "../prompts/implementation.js";
import { implementationQueue, validationQueue } from "../shared-resources.js";

const execFileAsync = promisify(execFile);
const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

const VALIDATION_ENABLED = process.env.VALIDATION_ENABLED === "true";

export async function checkWorkstreamCompletion(workstreamId: string, projectId: string) {
  const counts = await taskRepo.countTasksByWorkstream(workstreamId);
  console.log(
    `[Progress] Workstream ${workstreamId}: ${counts.completed}/${counts.total} completed, ${counts.failed} failed`,
  );

  if (counts.failed > 0) {
    await workstreamRepo.updateWorkstream(workstreamId, { status: "failed" });
    eventBus.emitTyped("workstream.failed", {
      workstreamId,
      projectId,
      error: `${counts.failed} of ${counts.total} tasks failed`,
    });
    await checkProjectCompletion(projectId);
    return;
  }

  if (counts.completed === counts.total && counts.total > 0) {
    await workstreamRepo.updateWorkstream(workstreamId, { status: "completed" });
    eventBus.emitTyped("workstream.completed", { workstreamId, projectId });

    if (VALIDATION_ENABLED) {
      await validationQueue.add("validate", { workstreamId, projectId });
      console.log(`[Progress] Enqueued validation for workstream ${workstreamId}`);
    }

    await unblockDependents(workstreamId, projectId);
    await checkProjectCompletion(projectId);
  }
}

async function unblockDependents(completedWorkstreamId: string, projectId: string) {
  const allWorkstreams = await workstreamRepo.listWorkstreamsByProject(projectId);

  // Get project provider
  const project = await projectRepo.getProjectById(projectId);
  const provider =
    ((project as Record<string, unknown>)?.provider as string) ||
    process.env.LLM_PROVIDER ||
    "opencode";

  // Build set of all completed workstream IDs
  const completedIds = new Set(
    allWorkstreams.filter((ws) => ws.status === "completed").map((ws) => ws.id),
  );
  completedIds.add(completedWorkstreamId);

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  for (const ws of allWorkstreams) {
    if (ws.status !== "pending" && ws.status !== "blocked") continue;
    if (ws.dependencies.length === 0) continue;

    // Dependencies are normalized to UUIDs by the planning worker
    const allDepsMet = ws.dependencies.every((dep) => {
      if (!UUID_RE.test(dep)) {
        console.warn(`[Progress] Non-UUID dependency "${dep}" in workstream ${ws.id} — skipping`);
        return true; // Don't block on invalid deps
      }
      return completedIds.has(dep);
    });

    if (allDepsMet) {
      await workstreamRepo.updateWorkstream(ws.id, { status: "in_progress" });
      eventBus.emitTyped("workstream.started", { workstreamId: ws.id, projectId });

      const task = await taskRepo.createTask({
        workstreamId: ws.id,
        projectId,
        role: (ws.assignedAgent as AgentRole) || "backend",
        prompt: buildUserMessage(`Implement the ${ws.name} workstream: ${ws.objective}`, ws),
      });

      if (!task) {
        console.warn(`[Progress] Failed to create task for workstream ${ws.id}`);
        continue;
      }

      eventBus.emitTyped("task.queued", { taskId: task.id, workstreamId: ws.id });

      await implementationQueue.add("implement", {
        taskId: task.id,
        workstreamId: ws.id,
        projectId,
        role: task.role,
        prompt: task.prompt,
        provider,
      });
    }
  }
}

async function checkProjectCompletion(projectId: string) {
  const workstreams = await workstreamRepo.listWorkstreamsByProject(projectId);

  const allCompleted = workstreams.every((ws) => ws.status === "completed");
  const anyFailed = workstreams.some((ws) => ws.status === "failed");
  const anyActive = workstreams.some((ws) =>
    ["in_progress", "pending", "blocked"].includes(ws.status),
  );

  if (allCompleted) {
    await projectRepo.updateProject(projectId, { status: "completed" });

    // Sync linked feature status → done
    await syncLinkedFeatureStatus(projectId, "done");

    // For existing-mode projects, commit changes on the work branch
    const project = await projectRepo.getProjectById(projectId);
    if (project?.projectMode === "existing" && project.workBranch) {
      const projectDir = project.repoPath
        ? resolve(project.repoPath)
        : resolve(PROJECTS_DIR, projectId);

      try {
        await execFileAsync("git", ["-C", projectDir, "add", "-A"]);
        await execFileAsync("git", [
          "-C",
          projectDir,
          "commit",
          "-m",
          `feat: ${project.name}`,
          "--allow-empty",
        ]);
        console.log(
          `[Progress] Committed changes on branch ${project.workBranch} for project ${projectId}`,
        );
      } catch (err) {
        console.warn(`[Progress] Failed to commit changes for project ${projectId}:`, err);
      }
    }
  } else if (anyFailed && !anyActive) {
    await projectRepo.updateProject(projectId, { status: "failed" });

    // Sync linked feature status → todo
    await syncLinkedFeatureStatus(projectId, "todo");
  }
}

async function syncLinkedFeatureStatus(projectId: string, status: "done" | "todo") {
  try {
    const feature = await featureRepo.getFeatureByProjectId(projectId);
    if (feature) {
      await featureRepo.updateFeature(feature.id, { status });
      console.log(
        `[Progress] Synced feature ${feature.id} status to "${status}" for project ${projectId}`,
      );
    }
  } catch (err) {
    console.warn(`[Progress] Failed to sync feature status for project ${projectId}:`, err);
  }
}
