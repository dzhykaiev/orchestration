import { type AgentRole, type ReviewVerdict } from "@orchestration/shared";
import type { ProgressDependencies, ProgressService } from "./ports.js";
import { resolveCompanyProjectRoot } from "../../runtime/company-paths.js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createProgressService(deps: ProgressDependencies): ProgressService {
  async function checkWorkstreamCompletion(workstreamId: string, projectId: string) {
    const result = await deps.withLock(`workstream-completion:${workstreamId}`, async () => {
      const counts = await deps.taskRepo.countTasksByWorkstream(workstreamId);
      console.log(
        `[Progress] Workstream ${workstreamId}: ${counts.completed}/${counts.total} completed, ${counts.failed} failed`,
      );

      if (counts.failed > 0) {
        const ws = await deps.workstreamRepo.getWorkstreamById(workstreamId);
        if (ws && !deps.canTransition(deps.transitions.workstream, ws.status, "failed")) {
          console.warn(
            `[Progress] Invalid workstream transition: ${ws.status} -> failed for ${workstreamId}, skipping`,
          );
        } else {
          await deps.workstreamRepo.updateWorkstream(workstreamId, { status: "failed" });
          deps.eventBus.emitTyped("workstream.failed", {
            workstreamId,
            projectId,
            error: `${counts.failed} of ${counts.total} tasks failed`,
          });

          try {
            await deps.auditLogRepo.createAuditLog({
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
        const ws = await deps.workstreamRepo.getWorkstreamById(workstreamId);
        if (ws && !deps.canTransition(deps.transitions.workstream, ws.status, "completed")) {
          console.warn(
            `[Progress] Invalid workstream transition: ${ws.status} -> completed for ${workstreamId}, skipping`,
          );
        } else {
          const prevStatus = ws?.status;
          await deps.workstreamRepo.updateWorkstream(workstreamId, { status: "completed" });
          deps.eventBus.emitTyped("workstream.completed", { workstreamId, projectId });

          try {
            await deps.auditLogRepo.createAuditLog({
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

        try {
          await createReviewerTask(workstreamId, projectId);
        } catch (err) {
          console.warn(
            `[Progress] Failed to create reviewer task for workstream ${workstreamId}:`,
            err,
          );
        }

        if (deps.validationEnabled) {
          await deps.validationQueue.add("validate", { workstreamId, projectId });
          console.log(`[Progress] Enqueued validation for workstream ${workstreamId}`);
        } else {
          await unblockDependents(workstreamId, projectId);
          await checkProjectCompletion(projectId);
        }
      }
    });

    if (result === null) {
      console.warn(
        `[Progress] Skipped workstream completion check for ${workstreamId} — lock held by another worker`,
      );
    }
  }

  async function unblockDependents(completedWorkstreamId: string, projectId: string) {
    const result = await deps.withLock(`unblock-deps:${projectId}`, async () => {
      const allWorkstreams = await deps.workstreamRepo.listWorkstreamsByProject(projectId);
      const project = await deps.projectRepo.getProjectById(projectId);
      const provider = deps.resolveProvider(project?.provider);

      const completedIds = new Set(
        allWorkstreams.filter((ws) => ws.status === "completed").map((ws) => ws.id),
      );
      completedIds.add(completedWorkstreamId);

      for (const ws of allWorkstreams) {
        if (ws.status !== "pending" && ws.status !== "blocked") continue;
        if (ws.dependencies.length === 0) continue;

        const allDepsMet = ws.dependencies.every((dep) => {
          if (!UUID_RE.test(dep)) {
            console.warn(
              `[Progress] Non-UUID dependency "${dep}" in workstream ${ws.id} — skipping`,
            );
            return true;
          }
          return completedIds.has(dep);
        });

        if (!allDepsMet) {
          continue;
        }

        if (!deps.canTransition(deps.transitions.workstream, ws.status, "in_progress")) {
          console.warn(
            `[Progress] Invalid workstream transition: ${ws.status} -> in_progress for ${ws.id}, skipping`,
          );
          continue;
        }

        const prevWsStatus = ws.status;
        await deps.workstreamRepo.updateWorkstream(ws.id, { status: "in_progress" });
        deps.eventBus.emitTyped("workstream.started", { workstreamId: ws.id, projectId });

        try {
          await deps.auditLogRepo.createAuditLog({
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

        const task = await deps.taskRepo.createTask({
          workstreamId: ws.id,
          projectId,
          role: (ws.assignedAgent as AgentRole) || deps.defaultImplementationRole,
          prompt: deps.buildUserMessage(`Implement the ${ws.name} workstream: ${ws.objective}`, ws),
        });

        if (!task) {
          console.warn(`[Progress] Failed to create task for workstream ${ws.id}`);
          continue;
        }

        deps.eventBus.emitTyped("task.queued", {
          taskId: task.id,
          projectId,
          workstreamId: ws.id,
        });

        await deps.implementationQueue.add(
          "implement",
          {
            taskId: task.id,
            workstreamId: ws.id,
            projectId,
            role: task.role,
            prompt: task.prompt,
            provider,
          },
          { jobId: `impl-${ws.id}` },
        );
      }
    });

    if (result === null) {
      console.warn(
        `[Progress] Skipped unblock dependents for ${completedWorkstreamId} — lock held by another worker`,
      );
    }
  }

  async function checkProjectCompletion(projectId: string) {
    const result = await deps.withLock(`project-completion:${projectId}`, async () => {
      const workstreams = await deps.workstreamRepo.listWorkstreamsByProject(projectId);
      if (workstreams.length === 0) {
        console.log(
          `[Progress] Project ${projectId}: no workstreams yet, skipping completion check`,
        );
        return;
      }

      const allCompleted = workstreams.every((ws) => ws.status === "completed");
      const anyFailed = workstreams.some((ws) => ws.status === "failed");
      const anyActive = workstreams.some((ws) =>
        ["in_progress", "pending", "blocked"].includes(ws.status),
      );

      if (allCompleted) {
        let project = await deps.projectRepo.getProjectById(projectId);
        if (project && !deps.canTransition(deps.transitions.project, project.status, "completed")) {
          console.warn(
            `[Progress] Invalid project transition: ${project.status} -> completed for ${projectId}, skipping`,
          );
          return;
        }
        const prevProjectStatus = project?.status;
        await deps.projectRepo.updateProject(projectId, { status: "completed" });

        try {
          await deps.auditLogRepo.createAuditLog({
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

        await syncLinkedFeatureStatus(projectId, "done");

        project = await deps.projectRepo.getProjectById(projectId);
        if (project?.projectMode === "existing" && project.workBranch) {
          const projectDir = resolveCompanyProjectRoot(project.workspaceId, projectId);

          try {
            await deps.runGit(projectDir, ["add", "-A"]);
            await deps.runGit(projectDir, [
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
        const project = await deps.projectRepo.getProjectById(projectId);
        if (project && !deps.canTransition(deps.transitions.project, project.status, "failed")) {
          console.warn(
            `[Progress] Invalid project transition: ${project.status} -> failed for ${projectId}, skipping`,
          );
          return;
        }
        await deps.projectRepo.updateProject(projectId, { status: "failed" });

        try {
          await deps.auditLogRepo.createAuditLog({
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

        await syncLinkedFeatureStatus(projectId, "todo");
      }
    });

    if (result === null) {
      console.warn(
        `[Progress] Skipped project completion check for ${projectId} — lock held by another worker`,
      );
    }
  }

  async function createReviewerTask(workstreamId: string, projectId: string) {
    const ws = await deps.workstreamRepo.getWorkstreamById(workstreamId);
    if (!ws) return;

    const existingTasks = await deps.taskRepo.listTasksByWorkstream(workstreamId);
    const hasReviewerTask = existingTasks.some(
      (task) => task.role === "reviewer" && (task.status === "queued" || task.status === "running"),
    );
    if (hasReviewerTask) {
      console.log(
        `[Progress] Reviewer task already exists for workstream ${workstreamId}, skipping`,
      );
      return;
    }

    const tasks = await deps.taskRepo.listTasksByWorkstream(workstreamId);
    const completedTasks = tasks.filter((task) => task.status === "completed");
    if (completedTasks.length === 0) {
      return;
    }

    const taskSummaries = completedTasks
      .map((task) => {
        const files = task.filesModified?.length
          ? `Files: ${task.filesModified.join(", ")}`
          : "No files modified";
        const output = task.output ? task.output.slice(0, 2000) : "No output";
        return `### Task (${task.role})\n${files}\nOutput summary: ${output}`;
      })
      .join("\n\n");

    const allFiles = completedTasks.flatMap((task) => task.filesModified ?? []);
    const uniqueFiles = [...new Set(allFiles)];

    const reviewPrompt = [
      `## Review Request for Workstream: ${ws.name}`,
      "",
      `**Objective:** ${ws.objective}`,
      `**Deliverables:** ${ws.deliverables.join(", ")}`,
      "",
      `## Modified Files (${uniqueFiles.length})`,
      uniqueFiles.map((file) => `- ${file}`).join("\n"),
      "",
      "## Task Outputs",
      taskSummaries,
      "",
      "## Instructions",
      "Review the workstream deliverables and task outputs above.",
      "Provide your verdict as one of: APPROVED, CHANGES_REQUESTED, or REJECTED.",
      "Include detailed feedback explaining your decision.",
    ].join("\n");

    const project = await deps.projectRepo.getProjectById(projectId);
    const provider = deps.resolveProvider(project?.provider);

    const reviewerTask = await deps.taskRepo.createTask({
      workstreamId,
      projectId,
      role: "reviewer",
      prompt: reviewPrompt,
    });

    if (!reviewerTask) {
      console.warn(`[Progress] Failed to create reviewer task for workstream ${workstreamId}`);
      return;
    }

    await deps.implementationQueue.add(
      "implement",
      {
        taskId: reviewerTask.id,
        workstreamId,
        projectId,
        role: "reviewer",
        prompt: reviewPrompt,
        provider,
      },
      { jobId: `review-${workstreamId}` },
    );

    deps.eventBus.emitTyped("task.queued", { taskId: reviewerTask.id, projectId, workstreamId });
    console.log(
      `[Progress] Created reviewer task ${reviewerTask.id} for workstream ${workstreamId}`,
    );
  }

  async function handleReviewerOutput(
    taskId: string,
    workstreamId: string,
    projectId: string,
    output: string,
  ): Promise<void> {
    const verdictMatch = deps.reviewVerdictPattern.exec(output);
    if (!verdictMatch) {
      console.warn(`[Progress] No verdict found in reviewer output for task ${taskId}`);
      return;
    }

    const verdictRaw = verdictMatch[1] as string;
    const verdict = verdictRaw.toLowerCase() as ReviewVerdict;

    try {
      await deps.reviewRepo.createReview({
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
        console.log(
          `[Progress] Workstream ${workstreamId} review: CHANGES_REQUESTED (retry not yet implemented)`,
        );
      } else if (verdict === "rejected") {
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
      const feature = await deps.featureRepo.getFeatureByProjectId(projectId);
      if (!feature) {
        return;
      }

      if (!deps.canTransition(deps.transitions.feature, feature.status, status)) {
        console.warn(
          `[Progress] Invalid feature transition: ${feature.status} -> ${status} for feature ${feature.id}, skipping`,
        );
        return;
      }

      await deps.featureRepo.updateFeature(feature.id, { status });
      console.log(
        `[Progress] Synced feature ${feature.id} status to "${status}" for project ${projectId}`,
      );
    } catch (err) {
      console.warn(`[Progress] Failed to sync feature status for project ${projectId}:`, err);
    }
  }

  return {
    checkWorkstreamCompletion,
    unblockDependents,
    checkProjectCompletion,
    handleReviewerOutput,
  };
}
