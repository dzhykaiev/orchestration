import { taskRepo } from "@orchestration/db";
import type { AgentRole } from "@orchestration/shared";
import { eventBus } from "../events/index.js";
import { implementationQueue } from "../shared-resources.js";

const DELEGATE_PATTERN = /^DELEGATE:\s*(\w+)\s*[—–-]\s*(.+)$/gm;

const VALID_ROLES: Set<string> = new Set([
  "ceo",
  "planner",
  "architect",
  "lead",
  "backend",
  "frontend",
  "data",
  "devops",
  "qa",
  "reviewer",
]);

export async function handleDelegation(params: {
  taskId: string;
  projectId: string;
  workstreamId: string;
  output: string;
  provider?: string;
}): Promise<{ delegated: boolean; childTaskIds: string[] }> {
  const matches = [...params.output.matchAll(DELEGATE_PATTERN)];
  if (matches.length === 0) return { delegated: false, childTaskIds: [] };

  const childTaskIds: string[] = [];

  for (const match of matches) {
    const [, role, prompt] = match;
    if (!role || !prompt) continue;

    const normalizedRole = role.toLowerCase();
    if (!VALID_ROLES.has(normalizedRole)) {
      console.warn(`[Delegation] Invalid role "${role}" in DELEGATE pattern, skipping`);
      continue;
    }

    try {
      const childTask = await taskRepo.createTask({
        workstreamId: params.workstreamId,
        projectId: params.projectId,
        role: normalizedRole as AgentRole,
        parentTaskId: params.taskId,
        prompt: prompt.trim(),
      });

      if (!childTask) {
        console.warn(`[Delegation] Failed to create child task for role ${role}`);
        continue;
      }

      await implementationQueue.add("implement", {
        taskId: childTask.id,
        workstreamId: params.workstreamId,
        projectId: params.projectId,
        role: normalizedRole,
        prompt: prompt.trim(),
        provider: params.provider,
      });

      eventBus.emitTyped("task.queued", {
        taskId: childTask.id,
        workstreamId: params.workstreamId,
      });

      childTaskIds.push(childTask.id);
      console.log(
        `[Delegation] Created child task ${childTask.id} (${normalizedRole}) from lead task ${params.taskId}`,
      );
    } catch (err) {
      console.error(`[Delegation] Failed to create/enqueue child task for role ${role}:`, err);
    }
  }

  return { delegated: childTaskIds.length > 0, childTaskIds };
}
