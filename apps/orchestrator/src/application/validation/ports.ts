import type { ValidationStatus } from "@orchestration/shared";
import type { Job } from "bullmq";

export interface ValidationJobData {
  workstreamId: string;
  projectId: string;
}

export interface ValidationLlmProvider {
  run(input: { prompt: string; systemPrompt: string; cwd: string }): Promise<{ result: string }>;
}

export interface ValidationProject {
  repoPath?: string | null;
  provider?: string | null;
  architecture?: string | null;
}

export interface ValidationWorkstream {
  id: string;
  status: string;
  name: string;
  objective: string;
  deliverables: string[];
}

export interface ValidationTask {
  filesModified?: string[] | null;
}

export interface ValidationProjectRepo {
  getProjectById(projectId: string): Promise<ValidationProject | null>;
}

export interface ValidationWorkstreamRepo {
  getWorkstreamById(workstreamId: string): Promise<ValidationWorkstream | null>;
  updateWorkstream(workstreamId: string, patch: Record<string, unknown>): Promise<unknown>;
}

export interface ValidationTaskRepo {
  listTasksByWorkstream(workstreamId: string): Promise<ValidationTask[]>;
}

export interface ValidationAuditLogRepo {
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

export interface ValidationArtifactRepo {
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

export interface ValidationDependencies {
  projectRepo: ValidationProjectRepo;
  workstreamRepo: ValidationWorkstreamRepo;
  taskRepo: ValidationTaskRepo;
  auditLogRepo: ValidationAuditLogRepo;
  artifactRepo: ValidationArtifactRepo;
  createLLMProvider(role: string, provider?: string): ValidationLlmProvider;
  resolveProvider(provider: string | null | undefined): string;
  qaBrief: string;
  eventBus: {
    emitTyped(event: string, payload: Record<string, unknown>): void;
  };
  unblockDependents(workstreamId: string, projectId: string): Promise<void>;
  checkProjectCompletion(projectId: string): Promise<void>;
  canWorkstreamTransition(from: string, to: string): boolean;
}

export type ValidationJobHandler = (job: Job<ValidationJobData>) => Promise<void>;

export interface ValidationPromptWorkstream {
  name: string;
  objective: string;
  deliverables: string[];
}

export interface ValidationResult {
  status: ValidationStatus;
  output: string;
}
