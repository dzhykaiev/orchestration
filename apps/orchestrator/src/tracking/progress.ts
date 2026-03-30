import { Queue } from "bullmq";
import IORedis from "ioredis";
import { projectRepo, workstreamRepo, taskRepo } from "@orchestration/db";
import { buildSystemPrompt, buildUserMessage } from "../prompts/implementation.js";
import type { AgentRole } from "@orchestration/shared";
import { eventBus } from "../events/index.js";

const connection = new IORedis.default(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});
const implementationQueue = new Queue("implementation", { connection });
const validationQueue = new Queue("validation", { connection });

const VALIDATION_ENABLED = process.env.VALIDATION_ENABLED === "true";

export async function checkWorkstreamCompletion(
  workstreamId: string,
  projectId: string,
) {
  const counts = await taskRepo.countTasksByWorkstream(workstreamId);

  if (counts.failed > 0) {
    await workstreamRepo.updateWorkstream(workstreamId, { status: "failed" });
    eventBus.emitTyped("workstream.failed", {
      workstreamId,
      projectId,
      error: "One or more tasks failed",
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
  const provider = (project as Record<string, unknown>)?.provider as string || process.env.LLM_PROVIDER || "opencode";

  // Build set of all completed workstream IDs
  const completedIds = new Set(
    allWorkstreams
      .filter((ws) => ws.status === "completed")
      .map((ws) => ws.id),
  );
  completedIds.add(completedWorkstreamId);

  // Build name-to-id map for resolving name-based dependencies
  const nameToId = new Map(allWorkstreams.map((ws) => [ws.name, ws.id]));

  for (const ws of allWorkstreams) {
    if (ws.status !== "pending" && ws.status !== "blocked") continue;
    if (ws.dependencies.length === 0) continue;

    // Dependencies might be IDs or names — check both
    const allDepsMet = ws.dependencies.every((dep) => {
      if (completedIds.has(dep)) return true;
      const resolvedId = nameToId.get(dep);
      return resolvedId ? completedIds.has(resolvedId) : false;
    });

    if (allDepsMet) {
      await workstreamRepo.updateWorkstream(ws.id, { status: "in_progress" });
      eventBus.emitTyped("workstream.started", { workstreamId: ws.id, projectId });

      const task = await taskRepo.createTask({
        workstreamId: ws.id,
        projectId,
        role: (ws.assignedAgent as AgentRole) || "backend",
        prompt: buildUserMessage(
          `Implement the ${ws.name} workstream: ${ws.objective}`,
          ws,
        ),
      });

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
  } else if (anyFailed && !anyActive) {
    await projectRepo.updateProject(projectId, { status: "failed" });
  }
}
