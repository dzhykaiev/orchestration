import type { AgentRole, AgentTier } from "@orchestration/shared";

export interface EscalationSignal {
  reason: string;
}

export interface EscalationDependencies {
  taskRepo: {
    getTaskById(taskId: string): Promise<{
      role: string;
      tier?: string | null;
      prompt: string;
      workstreamId: string;
    } | null>;
    createTask(input: {
      workstreamId: string;
      projectId: string;
      role: AgentRole;
      tier: AgentTier;
      parentTaskId: string;
      prompt: string;
    }): Promise<{ id: string } | null>;
  };
  escalationRepo: {
    createEscalation(input: {
      taskId: string;
      projectId: string;
      fromTier: AgentTier;
      toTier: AgentTier;
      reason: string;
      context: Record<string, unknown>;
    }): Promise<unknown>;
  };
  implementationQueue: {
    add(name: string, data: Record<string, unknown>, opts?: { jobId?: string }): Promise<unknown>;
  };
  eventBus: {
    emitTyped(event: string, payload: Record<string, unknown>): void;
  };
  getParentTier(tier: AgentTier): AgentTier | null;
  roleToTier(role: string): AgentTier;
  tierToEscalationRole: Record<string, AgentRole>;
}
