import { taskRepo } from "@orchestration/db";
import type { AgentRole } from "@orchestration/shared";
import { eventBus } from "../events/index.js";
import { implementationQueue } from "../shared-resources.js";

const DELEGATE_PATTERN = /^DELEGATE:\s*(\w+)\s*[—–-]\s*(.+)$/gm;

const VALID_ROLES: Set<string> = new Set([
  "backend",
  "frontend",
  "data",
  "devops",
  "qa",
  "reviewer",
]);

const MAX_DELEGATION_DEPTH = 3;

export async function handleDelegation(params: {
  taskId: string;
  projectId: string;
  workstreamId: string;
  output: string;
  provider?: string;
}): Promise<{ delegated: boolean; childTaskIds: string[] }> {
  const childTaskIds: string[] = [];

  const parentTask = await taskRepo.getTaskById(params.taskId);
  if (!parentTask) return { delegated: false, childTaskIds: [] };

  const currentDepth = parentTask.depth ?? 0;
  if (currentDepth >= MAX_DELEGATION_DEPTH) {
    console.warn(
      `[Delegation] Max delegation depth (${MAX_DELEGATION_DEPTH}) reached for task ${params.taskId}, skipping`,
    );
    return { delegated: false, childTaskIds: [] };
  }

  const delegations = parseDelegations(params.output);
  if (delegations.length === 0) return { delegated: false, childTaskIds: [] };

  for (const { role, prompt } of delegations) {
    if (!VALID_ROLES.has(role)) {
      console.warn(`[Delegation] Invalid role "${role}", skipping`);
      continue;
    }

    try {
      const childTask = await taskRepo.createTask({
        workstreamId: params.workstreamId,
        projectId: params.projectId,
        role: role as AgentRole,
        parentTaskId: params.taskId,
        prompt: prompt.trim(),
      });

      if (!childTask) {
        console.warn(`[Delegation] Failed to create child task for role ${role}`);
        continue;
      }

      await implementationQueue.add(
        "implement",
        {
          taskId: childTask.id,
          workstreamId: params.workstreamId,
          projectId: params.projectId,
          role,
          prompt: prompt.trim(),
          provider: params.provider,
        },
        { jobId: `delegate-${childTask.id}` },
      );

      eventBus.emitTyped("task.queued", {
        taskId: childTask.id,
        workstreamId: params.workstreamId,
      });

      childTaskIds.push(childTask.id);
      console.log(
        `[Delegation] Created child task ${childTask.id} (${role}) from lead task ${params.taskId}`,
      );
    } catch (err) {
      console.error(`[Delegation] Failed to create/enqueue child task for role ${role}:`, err);
    }
  }

  return { delegated: childTaskIds.length > 0, childTaskIds };
}

interface Delegation {
  role: string;
  prompt: string;
}

function parseDelegations(output: string): Delegation[] {
  const delegations: Delegation[] = [];

  const textMatches = [...output.matchAll(DELEGATE_PATTERN)];
  for (const match of textMatches) {
    const [, role, prompt] = match;
    if (role && prompt) {
      delegations.push({ role: role.toLowerCase(), prompt: prompt.trim() });
    }
  }

  if (delegations.length > 0) return delegations;

  try {
    const jsonMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch?.[1]) {
      const parsed = JSON.parse(jsonMatch[1]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.role && item.prompt) {
            delegations.push({
              role: String(item.role).toLowerCase(),
              prompt: String(item.prompt),
            });
          }
        }
      } else if (parsed.delegations && Array.isArray(parsed.delegations)) {
        for (const item of parsed.delegations) {
          if (item.role && item.prompt) {
            delegations.push({
              role: String(item.role).toLowerCase(),
              prompt: String(item.prompt),
            });
          }
        }
      } else if (parsed.delegate && Array.isArray(parsed.delegate)) {
        for (const item of parsed.delegate) {
          if (item.role && item.prompt) {
            delegations.push({
              role: String(item.role).toLowerCase(),
              prompt: String(item.prompt),
            });
          }
        }
      }
    }
  } catch {
    // Not JSON — fall through, return empty if text pattern also failed
  }

  return delegations;
}
