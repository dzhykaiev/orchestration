import { escalationRepo, taskRepo } from "@orchestration/db";
import type { AgentRole, AgentTier } from "@orchestration/shared";
import { eventBus } from "../events/index.js";
import { getParentTier, roleToTier } from "../hierarchy/agent-router.js";
import { implementationQueue } from "../shared-resources.js";

const ESCALATE_RE = /ESCALATE:\s*(.+?)(?:\n|$)/;

/** Map a parent tier to a concrete role for escalation */
const TIER_TO_ESCALATION_ROLE: Record<string, AgentRole> = {
  ceo: "ceo",
  planner: "planner",
  architect: "architect",
  lead: "lead",
  specialist: "backend",
  reviewer: "reviewer",
};

export function detectEscalation(output: string): { reason: string } | null {
  const match = ESCALATE_RE.exec(output);
  if (!match) return null;
  return { reason: match[1]?.trim() ?? "Unknown reason" };
}

export async function handleEscalation(
  taskId: string,
  projectId: string,
  output: string,
): Promise<boolean> {
  const signal = detectEscalation(output);
  if (!signal) return false;

  const task = await taskRepo.getTaskById(taskId);
  if (!task) return false;

  const fromTier: AgentTier = (task.tier as AgentTier) ?? roleToTier(task.role);
  const toTier = getParentTier(fromTier);
  if (!toTier) return false;

  await escalationRepo.createEscalation({
    taskId,
    projectId,
    fromTier,
    toTier,
    reason: signal.reason,
    context: { output: output.slice(0, 2000) },
  });

  // Create a new task for the parent tier to handle the escalation
  try {
    const parentRole = TIER_TO_ESCALATION_ROLE[toTier] ?? "architect";
    const escalationPrompt = [
      `Escalation from ${task.role}: ${signal.reason}`,
      "",
      `Original task: ${task.prompt}`,
      "",
      `Agent output so far: ${output.slice(0, 3000)}`,
    ].join("\n");

    const parentTask = await taskRepo.createTask({
      workstreamId: task.workstreamId,
      projectId,
      role: parentRole,
      tier: toTier,
      parentTaskId: taskId,
      prompt: escalationPrompt,
    });

    if (parentTask) {
      await implementationQueue.add("implement", {
        taskId: parentTask.id,
        workstreamId: task.workstreamId,
        projectId,
        role: parentRole,
        prompt: escalationPrompt,
      });

      eventBus.emitTyped("task.queued", { taskId: parentTask.id, workstreamId: task.workstreamId });
      console.log(
        `[Escalation] Created parent-tier task ${parentTask.id} (${parentRole}) for escalation from ${task.role}`,
      );
    }
  } catch (err) {
    console.error(
      `[Escalation] Failed to create parent-tier task for escalation from task ${taskId}:`,
      err,
    );
  }

  return true;
}
