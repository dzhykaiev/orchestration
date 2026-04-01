import type { AgentRole } from "@orchestration/shared";
import type {
  DelegationDependencies,
  DelegationItem,
  DelegationResult,
  HandleDelegationInput,
} from "./ports.js";

const DELEGATE_PATTERN = /^DELEGATE:\s*(\w+)\s*[—–-]\s*(.+)$/gm;

function parseDelegations(output: string): DelegationItem[] {
  const delegations: DelegationItem[] = [];

  const textMatches = [...output.matchAll(DELEGATE_PATTERN)];
  for (const match of textMatches) {
    const [, role, prompt] = match;
    if (role && prompt) {
      delegations.push({ role: role.toLowerCase(), prompt: prompt.trim() });
    }
  }

  if (delegations.length > 0) {
    return delegations;
  }

  try {
    const jsonMatch = output.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (!jsonMatch?.[1]) {
      return delegations;
    }

    const parsed = JSON.parse(jsonMatch[1]);
    const payload = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed.delegations)
        ? parsed.delegations
        : Array.isArray(parsed.delegate)
          ? parsed.delegate
          : [];

    for (const item of payload) {
      if (item.role && item.prompt) {
        delegations.push({
          role: String(item.role).toLowerCase(),
          prompt: String(item.prompt),
        });
      }
    }
  } catch {
    // Not valid JSON; keep parsed text directives only.
  }

  return delegations;
}

export function createDelegationHandler(
  deps: DelegationDependencies,
): (params: HandleDelegationInput) => Promise<DelegationResult> {
  return async (params: HandleDelegationInput) => {
    const childTaskIds: string[] = [];

    const parentTask = await deps.taskRepo.getTaskById(params.taskId);
    if (!parentTask) {
      return { delegated: false, childTaskIds: [] };
    }

    const currentDepth = parentTask.depth ?? 0;
    if (currentDepth >= deps.maxDelegationDepth) {
      console.warn(
        `[Delegation] Max delegation depth (${deps.maxDelegationDepth}) reached for task ${params.taskId}, skipping`,
      );
      return { delegated: false, childTaskIds: [] };
    }

    const delegations = parseDelegations(params.output);
    if (delegations.length === 0) {
      return { delegated: false, childTaskIds: [] };
    }

    for (const { role, prompt } of delegations) {
      if (!deps.validRoles.has(role)) {
        console.warn(`[Delegation] Invalid role "${role}", skipping`);
        continue;
      }

      try {
        const childTask = await deps.taskRepo.createTask({
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

        await deps.implementationQueue.add(
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

        deps.eventBus.emitTyped("task.queued", {
          taskId: childTask.id,
          projectId: params.projectId,
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
  };
}
