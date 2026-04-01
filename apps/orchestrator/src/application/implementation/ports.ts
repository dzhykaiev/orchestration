import type { AgentRole } from "@orchestration/shared";
import type { Job } from "bullmq";

export interface ImplementationJobData {
  taskId: string;
  workstreamId: string;
  projectId: string;
  role: string;
  prompt: string;
  provider?: string;
  sessionId?: string;
}

export interface ImplementationLlmProvider {
  run(input: {
    prompt: string;
    systemPrompt: string;
    cwd: string;
    sessionId?: string;
  }): Promise<{ result: string; costUsd?: number; sessionId?: string }>;
}

export interface ImplementationProject {
  status: string;
  workspaceId: string;
  architecture?: string | null;
}

export interface ImplementationTask {
  id: string;
  attempts: number;
  maxAttempts: number;
}

export interface ImplementationAgentDefinition {
  systemPrompt?: string | null;
  capabilities?: string[] | null;
}

export interface ImplementationProjectRepo {
  getProjectById(projectId: string): Promise<ImplementationProject | null>;
}

export interface ImplementationWorkstreamRepo {
  getWorkstreamById(workstreamId: string): Promise<{ id: string } | null>;
}

export interface ImplementationTaskRepo {
  markTaskStarted(taskId: string): Promise<unknown>;
  markTaskFailed(taskId: string, error: string): Promise<unknown>;
  markTaskCompleted(
    taskId: string,
    output: string,
    filesModified: string[],
    costUsd?: number,
  ): Promise<unknown>;
  getTaskById(taskId: string): Promise<ImplementationTask | null>;
  retryTask(taskId: string): Promise<unknown>;
}

export interface ImplementationAuditLogRepo {
  createAuditLog(input: {
    projectId?: string;
    entityType: string;
    entityId: string;
    action: string;
    actorType: string;
    actorId?: string | null;
    metadata?: Record<string, unknown>;
    workspaceId?: string | null;
  }): Promise<unknown>;
}

export interface ImplementationArtifactRepo {
  createArtifact(input: {
    projectId: string;
    type: string;
    name: string;
    content: string;
    workstreamId?: string;
    taskId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
}

export interface ImplementationAgentDefinitionRepo {
  getByRole(workspaceId: string, role: string): Promise<ImplementationAgentDefinition | null>;
}

export interface ImplementationDependencies {
  projectRepo: ImplementationProjectRepo;
  workstreamRepo: ImplementationWorkstreamRepo;
  taskRepo: ImplementationTaskRepo;
  auditLogRepo: ImplementationAuditLogRepo;
  artifactRepo: ImplementationArtifactRepo;
  agentDefinitionRepo: ImplementationAgentDefinitionRepo;
  eventBus: {
    emitTyped(event: string, payload: Record<string, unknown>): void;
  };
  createLLMProvider(role: string, provider?: string): ImplementationLlmProvider;
  buildSystemPrompt(
    role: AgentRole,
    architecture: string,
    opts: { customBrief?: string; capabilities?: string[] },
  ): string;
  snapshotFiles(projectDir: string): Promise<Map<string, number>>;
  diffSnapshots(before: Map<string, number>, after: Map<string, number>): string[];
  handleEscalation(taskId: string, projectId: string, output: string): Promise<boolean>;
  handleDelegation(input: {
    taskId: string;
    projectId: string;
    workstreamId: string;
    output: string;
    provider?: string;
  }): Promise<{ delegated: boolean; childTaskIds: string[] }>;
  checkWorkstreamCompletion(workstreamId: string, projectId: string): Promise<void>;
  handleReviewerOutput(
    taskId: string,
    workstreamId: string,
    projectId: string,
    result: string,
  ): Promise<void>;
  implementationQueue: {
    add(
      name: string,
      data: Record<string, unknown>,
      opts?: { delay?: number; jobId?: string },
    ): Promise<unknown>;
  };
}

export type ImplementationJobHandler = (job: Job<ImplementationJobData>) => Promise<void>;
