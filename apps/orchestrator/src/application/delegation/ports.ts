import type { AgentRole } from "@orchestration/shared";

export interface DelegationParentTask {
  depth?: number | null;
}

export interface DelegationTask {
  id: string;
}

export interface DelegationTaskRepo {
  getTaskById(taskId: string): Promise<DelegationParentTask | null>;
  createTask(input: CreateDelegatedTaskInput): Promise<DelegationTask | null>;
}

export interface DelegationDependencies {
  taskRepo: DelegationTaskRepo;
  implementationQueue: {
    add(name: string, data: Record<string, unknown>, opts?: { jobId?: string }): Promise<unknown>;
  };
  eventBus: {
    emitTyped(event: string, payload: Record<string, unknown>): void;
  };
  validRoles: Set<string>;
  maxDelegationDepth: number;
}

export interface HandleDelegationInput {
  taskId: string;
  projectId: string;
  workstreamId: string;
  output: string;
  provider?: string;
}

export interface DelegationResult {
  delegated: boolean;
  childTaskIds: string[];
}

export interface DelegationItem {
  role: string;
  prompt: string;
}

export type CreateDelegatedTaskInput = {
  workstreamId: string;
  projectId: string;
  role: AgentRole;
  parentTaskId: string;
  prompt: string;
};
