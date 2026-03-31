import { escalationRepo, taskRepo } from "@orchestration/db";
import type { AgentTier } from "@orchestration/shared";
import { getParentTier, roleToTier } from "../hierarchy/agent-router.js";

const ESCALATE_RE = /ESCALATE:\s*(.+?)(?:\n|$)/;

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

  return true;
}
