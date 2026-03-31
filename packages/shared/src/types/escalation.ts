import type { AgentTier } from "./agent-task.js";

export type EscalationStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export interface Escalation {
  id: string;
  taskId: string;
  projectId: string;
  fromTier: AgentTier;
  toTier: AgentTier;
  reason: string;
  context: Record<string, unknown>;
  status: EscalationStatus;
  resolution: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEscalationInput {
  taskId: string;
  projectId: string;
  fromTier: AgentTier;
  toTier: AgentTier;
  reason: string;
  context?: Record<string, unknown>;
}
