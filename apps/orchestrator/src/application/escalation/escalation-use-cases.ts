import type { AgentTier } from "@orchestration/shared";
import type { EscalationDependencies, EscalationSignal } from "./ports.js";

const ESCALATE_RE = /ESCALATE:\s*(.+?)(?:\n|$)/;

export function detectEscalation(output: string): EscalationSignal | null {
  const match = ESCALATE_RE.exec(output);
  if (!match) {
    return null;
  }
  return { reason: match[1]?.trim() ?? "Unknown reason" };
}

export function createEscalationHandler(
  deps: EscalationDependencies,
): (taskId: string, projectId: string, output: string) => Promise<boolean> {
  return async (taskId: string, projectId: string, output: string) => {
    const signal = detectEscalation(output);
    if (!signal) {
      return false;
    }

    const task = await deps.taskRepo.getTaskById(taskId);
    if (!task) {
      return false;
    }

    const fromTier: AgentTier = (task.tier as AgentTier) ?? deps.roleToTier(task.role);
    const toTier = deps.getParentTier(fromTier);
    if (!toTier) {
      console.warn(`[Escalation] No parent tier for ${fromTier}, cannot escalate task ${taskId}`);
      return false;
    }

    await deps.escalationRepo.createEscalation({
      taskId,
      projectId,
      fromTier,
      toTier,
      reason: signal.reason,
      context: { output: output.slice(0, 2000) },
    });

    const parentRole = deps.tierToEscalationRole[toTier] ?? "architect";
    const escalationPrompt = [
      `Escalation from ${task.role}: ${signal.reason}`,
      "",
      `Original task: ${task.prompt}`,
      "",
      `Agent output so far: ${output.slice(0, 3000)}`,
    ].join("\n");

    const parentTask = await deps.taskRepo.createTask({
      workstreamId: task.workstreamId,
      projectId,
      role: parentRole,
      tier: toTier,
      parentTaskId: taskId,
      prompt: escalationPrompt,
    });

    if (!parentTask) {
      console.error(`[Escalation] Failed to create parent-tier task for task ${taskId}`);
      return false;
    }

    await deps.implementationQueue.add(
      "implement",
      {
        taskId: parentTask.id,
        workstreamId: task.workstreamId,
        projectId,
        role: parentRole,
        prompt: escalationPrompt,
      },
      { jobId: `escalation-${parentTask.id}` },
    );

    deps.eventBus.emitTyped("task.queued", {
      taskId: parentTask.id,
      projectId,
      workstreamId: task.workstreamId,
    });
    console.log(
      `[Escalation] Created parent-tier task ${parentTask.id} (${parentRole}) for escalation from ${task.role}`,
    );

    return true;
  };
}
