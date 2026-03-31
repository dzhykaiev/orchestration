import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  auditLogRepo,
  featureRepo,
  projectRepo,
  reviewRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import type {
  AgentRole,
  FeatureStatus,
  ProjectStatus,
  ReviewVerdict,
  WorkstreamStatus,
} from "@orchestration/shared";
import {
  FEATURE_TRANSITIONS,
  PROJECT_TRANSITIONS,
  WORKSTREAM_TRANSITIONS,
  canTransition,
} from "@orchestration/shared";
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
    const ws = await workstreamRepo.getWorkstreamById(workstreamId);
    if (ws && !canTransition(WORKSTREAM_TRANSITIONS, ws.status as WorkstreamStatus, "failed")) {
      console.warn(
        `[Progress] Invalid workstream transition: ${ws.status} -> failed for ${workstreamId}, skipping`,
      );
    } else {
      await workstreamRepo.updateWorkstream(workstreamId, { status: "failed" });
      eventBus.emitTyped("workstream.failed", {
        workstreamId,
        projectId,
        error: `${counts.failed} of ${counts.total} tasks failed`,
      });

      try {
        await auditLogRepo.createAuditLog({
          projectId,
          entityType: "workstream",
          entityId: workstreamId,
          action: "status_changed",
          actorType: "system",
          metadata: {
            from: ws?.status,
            to: "failed",
            failedTasks: counts.failed,
            totalTasks: counts.total,
          },
        });
      } catch (err) {
        console.warn("[Progress] Failed to create audit log for workstream failure:", err);
      }
    }
    await checkProjectCompletion(projectId);
    return;
  }

  if (counts.completed === counts.total && counts.total > 0) {
    const ws = await workstreamRepo.getWorkstreamById(workstreamId);
    if (ws && !canTransition(WORKSTREAM_TRANSITIONS, ws.status as WorkstreamStatus, "completed")) {
      console.warn(
        `[Progress] Invalid workstream transition: ${ws.status} -> completed for ${workstreamId}, skipping`,
      );
    } else {
      const prevStatus = ws?.status;
      await workstreamRepo.updateWorkstream(workstreamId, { status: "completed" });
      eventBus.emitTyped("workstream.completed", { workstreamId, projectId });

      try {
        await auditLogRepo.createAuditLog({
          projectId,
          entityType: "workstream",
          entityId: workstreamId,
          action: "status_changed",
          actorType: "system",
          metadata: { from: prevStatus, to: "completed" },
        });
      } catch (err) {
        console.warn("[Progress] Failed to create audit log for workstream completion:", err);
      }
    }

    // Create automatic reviewer task before validation
    try {
      await createReviewerTask(workstreamId, projectId);
    } catch (err) {
      console.warn(
        `[Progress] Failed to create reviewer task for workstream ${workstreamId}:`,
        err,
      );
    }

    if (VALIDATION_ENABLED) {
      // When validation is enabled, defer unlocking dependents until validation passes.
      // The validation worker will call unblockDependents() after a PASS verdict.
      await validationQueue.add("validate", { workstreamId, projectId });
      console.log(`[Progress] Enqueued validation for workstream ${workstreamId}`);
    } else {
      // No validation — unblock dependents immediately
      await unblockDependents(workstreamId, projectId);
      await checkProjectCompletion(projectId);
    }
  }
}

export async function unblockDependents(completedWorkstreamId: string, projectId: string) {
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
      if (!canTransition(WORKSTREAM_TRANSITIONS, ws.status as WorkstreamStatus, "in_progress")) {
        console.warn(
          `[Progress] Invalid workstream transition: ${ws.status} -> in_progress for ${ws.id}, skipping`,
        );
        continue;
      }
      const prevWsStatus = ws.status;
      await workstreamRepo.updateWorkstream(ws.id, { status: "in_progress" });
      eventBus.emitTyped("workstream.started", { workstreamId: ws.id, projectId });

      try {
        await auditLogRepo.createAuditLog({
          projectId,
          entityType: "workstream",
          entityId: ws.id,
          action: "status_changed",
          actorType: "system",
          metadata: { from: prevWsStatus, to: "in_progress", trigger: "dependencies_met" },
        });
      } catch (err) {
        console.warn("[Progress] Failed to create audit log for workstream unblock:", err);
      }

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

export async function checkProjectCompletion(projectId: string) {
  const workstreams = await workstreamRepo.listWorkstreamsByProject(projectId);

  const allCompleted = workstreams.every((ws) => ws.status === "completed");
  const anyFailed = workstreams.some((ws) => ws.status === "failed");
  const anyActive = workstreams.some((ws) =>
    ["in_progress", "pending", "blocked"].includes(ws.status),
  );

  if (allCompleted) {
    let project = await projectRepo.getProjectById(projectId);
    if (
      project &&
      !canTransition(PROJECT_TRANSITIONS, project.status as ProjectStatus, "completed")
    ) {
      console.warn(
        `[Progress] Invalid project transition: ${project.status} -> completed for ${projectId}, skipping`,
      );
      return;
    }
    const prevProjectStatus = project?.status;
    await projectRepo.updateProject(projectId, { status: "completed" });

    try {
      await auditLogRepo.createAuditLog({
        projectId,
        entityType: "project",
        entityId: projectId,
        action: "status_changed",
        actorType: "system",
        metadata: { from: prevProjectStatus, to: "completed" },
      });
    } catch (err) {
      console.warn("[Progress] Failed to create audit log for project completion:", err);
    }

    // Sync linked feature status → done
    await syncLinkedFeatureStatus(projectId, "done");

    // For existing-mode projects, commit changes on the work branch
    project = await projectRepo.getProjectById(projectId);
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
    const project = await projectRepo.getProjectById(projectId);
    if (project && !canTransition(PROJECT_TRANSITIONS, project.status as ProjectStatus, "failed")) {
      console.warn(
        `[Progress] Invalid project transition: ${project.status} -> failed for ${projectId}, skipping`,
      );
      return;
    }
    await projectRepo.updateProject(projectId, { status: "failed" });

    try {
      await auditLogRepo.createAuditLog({
        projectId,
        entityType: "project",
        entityId: projectId,
        action: "status_changed",
        actorType: "system",
        metadata: { from: project?.status, to: "failed" },
      });
    } catch (err) {
      console.warn("[Progress] Failed to create audit log for project failure:", err);
    }

    // Sync linked feature status → todo
    await syncLinkedFeatureStatus(projectId, "todo");
  }
}

async function createReviewerTask(workstreamId: string, projectId: string) {
  const ws = await workstreamRepo.getWorkstreamById(workstreamId);
  if (!ws) return;

  const tasks = await taskRepo.listTasksByWorkstream(workstreamId);
  const completedTasks = tasks.filter((t) => t.status === "completed");

  if (completedTasks.length === 0) return;

  // Build a summary of task outputs and modified files
  const taskSummaries = completedTasks
    .map((t) => {
      const files = t.filesModified?.length
        ? `Files: ${t.filesModified.join(", ")}`
        : "No files modified";
      const output = t.output ? t.output.slice(0, 500) : "No output";
      return `### Task (${t.role})\n${files}\nOutput summary: ${output}`;
    })
    .join("\n\n");

  const allFiles = completedTasks.flatMap((t) => t.filesModified ?? []);
  const uniqueFiles = [...new Set(allFiles)];

  const reviewPrompt = [
    `## Review Request for Workstream: ${ws.name}`,
    "",
    `**Objective:** ${ws.objective}`,
    `**Deliverables:** ${ws.deliverables.join(", ")}`,
    "",
    `## Modified Files (${uniqueFiles.length})`,
    uniqueFiles.map((f) => `- ${f}`).join("\n"),
    "",
    "## Task Outputs",
    taskSummaries,
    "",
    "## Instructions",
    "Review the workstream deliverables and task outputs above.",
    "Provide your verdict as one of: APPROVED, CHANGES_REQUESTED, or REJECTED.",
    "Include detailed feedback explaining your decision.",
  ].join("\n");

  // Get project provider
  const project = await projectRepo.getProjectById(projectId);
  const provider =
    ((project as Record<string, unknown>)?.provider as string) ||
    process.env.LLM_PROVIDER ||
    "opencode";

  const reviewerTask = await taskRepo.createTask({
    workstreamId,
    projectId,
    role: "reviewer",
    prompt: reviewPrompt,
  });

  if (!reviewerTask) {
    console.warn(`[Progress] Failed to create reviewer task for workstream ${workstreamId}`);
    return;
  }

  await implementationQueue.add("implement", {
    taskId: reviewerTask.id,
    workstreamId,
    projectId,
    role: "reviewer",
    prompt: reviewPrompt,
    provider,
  });

  eventBus.emitTyped("task.queued", { taskId: reviewerTask.id, workstreamId });
  console.log(`[Progress] Created reviewer task ${reviewerTask.id} for workstream ${workstreamId}`);
}

const VERDICT_PATTERN = /\b(APPROVED|CHANGES_REQUESTED|REJECTED)\b/;

/**
 * Parse reviewer output and create a review record.
 * Call this from the implementation worker when a reviewer task completes.
 */
export async function handleReviewerOutput(
  taskId: string,
  workstreamId: string,
  projectId: string,
  output: string,
): Promise<void> {
  const verdictMatch = VERDICT_PATTERN.exec(output);
  if (!verdictMatch) {
    console.warn(`[Progress] No verdict found in reviewer output for task ${taskId}`);
    return;
  }

  const verdictRaw = verdictMatch[1] as string;
  const verdict = verdictRaw.toLowerCase() as ReviewVerdict;

  try {
    await reviewRepo.createReview({
      taskId,
      workstreamId,
      projectId,
      verdict,
      feedback: output.slice(0, 5000),
    });
    console.log(`[Progress] Created review record for task ${taskId} with verdict: ${verdict}`);

    if (verdict === "approved") {
      console.log(`[Progress] Workstream ${workstreamId} review: APPROVED`);
    } else if (verdict === "changes_requested") {
      // TODO: Implement retry loop — create new tasks with reviewer feedback
      // For now, just log the result. The workstream remains completed.
      console.log(
        `[Progress] Workstream ${workstreamId} review: CHANGES_REQUESTED (retry not yet implemented)`,
      );
    } else if (verdict === "rejected") {
      // TODO: Handle rejected reviews — potentially mark workstream as failed
      console.log(
        `[Progress] Workstream ${workstreamId} review: REJECTED (handling not yet implemented)`,
      );
    }
  } catch (err) {
    console.error(`[Progress] Failed to create review record for task ${taskId}:`, err);
  }
}

async function syncLinkedFeatureStatus(projectId: string, status: "done" | "todo") {
  try {
    const feature = await featureRepo.getFeatureByProjectId(projectId);
    if (feature) {
      if (!canTransition(FEATURE_TRANSITIONS, feature.status as FeatureStatus, status)) {
        console.warn(
          `[Progress] Invalid feature transition: ${feature.status} -> ${status} for feature ${feature.id}, skipping`,
        );
        return;
      }
      await featureRepo.updateFeature(feature.id, { status });
      console.log(
        `[Progress] Synced feature ${feature.id} status to "${status}" for project ${projectId}`,
      );
    }
  } catch (err) {
    console.warn(`[Progress] Failed to sync feature status for project ${projectId}:`, err);
  }
}
