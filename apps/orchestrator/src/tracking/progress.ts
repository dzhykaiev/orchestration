import { Queue } from "bullmq";
import IORedis from "ioredis";
import * as repo from "../db/repositories.js";
import { buildSystemPrompt, buildUserMessage } from "../prompts/implementation.js";
import type { AgentRole } from "../../../../contracts/types/agent-task.js";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const implementationQueue = new Queue("implementation", { connection });

export async function checkWorkstreamCompletion(
  workstreamId: string,
  projectId: string,
) {
  const counts = await repo.countTasksByWorkstream(workstreamId);

  if (counts.failed > 0) {
    await repo.updateWorkstream(workstreamId, { status: "failed" });
    await checkProjectCompletion(projectId);
    return;
  }

  if (counts.completed === counts.total && counts.total > 0) {
    await repo.updateWorkstream(workstreamId, { status: "completed" });
    await unblockDependents(workstreamId, projectId);
    await checkProjectCompletion(projectId);
  }
}

async function unblockDependents(completedWorkstreamId: string, projectId: string) {
  const allWorkstreams = await repo.listWorkstreamsByProject(projectId);

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
      await repo.updateWorkstream(ws.id, { status: "in_progress" });

      // Get the project for architecture context
      const project = await repo.getProjectById(projectId);

      const task = await repo.createTask({
        workstreamId: ws.id,
        projectId,
        role: (ws.assignedAgent as AgentRole) || "backend",
        prompt: buildUserMessage(
          `Implement the ${ws.name} workstream: ${ws.objective}`,
          ws,
        ),
      });

      await implementationQueue.add("implement", {
        taskId: task.id,
        workstreamId: ws.id,
        projectId,
        role: task.role,
        prompt: task.prompt,
      });
    }
  }
}

async function checkProjectCompletion(projectId: string) {
  const workstreams = await repo.listWorkstreamsByProject(projectId);

  const allCompleted = workstreams.every((ws) => ws.status === "completed");
  const anyFailed = workstreams.some((ws) => ws.status === "failed");
  const anyActive = workstreams.some((ws) =>
    ["in_progress", "pending", "blocked", "queued"].includes(ws.status),
  );

  if (allCompleted) {
    await repo.updateProject(projectId, { status: "completed" });
  } else if (anyFailed && !anyActive) {
    await repo.updateProject(projectId, { status: "failed" });
  }
}
