import type { AgentRole, ProjectStatus, WorkstreamStatus } from "@orchestration/shared";
import type { Job } from "bullmq";

export interface PlanningJobData {
  projectId: string;
  goal: string;
  provider?: string;
}

export interface PlanningProject {
  id: string;
  status: string;
  projectMode?: string | null;
  repoPath?: string | null;
  repoUrl?: string | null;
}

export interface PlanningWorkstreamInput {
  projectId: string;
  name: string;
  objective: string;
  dependencies: string[];
  deliverables: string[];
  ownedPaths: string[];
  assignedAgent?: AgentRole | string | null;
  order?: number;
}

export interface PlanningWorkstream extends PlanningWorkstreamInput {
  id: string;
  status: string;
}

export interface PlanningTask {
  id: string;
  role: string;
  prompt: string;
}

export interface PlanningTaskCreateInput {
  workstreamId: string;
  projectId: string;
  role: AgentRole;
  prompt: string;
}

export interface PlanningWorkstreamCreateInput {
  projectId: string;
  name: string;
  objective: string;
  dependencies: string[];
  deliverables: string[];
  ownedPaths: string[];
  assignedAgent?: AgentRole | string | null;
  order?: number;
}

export interface PlanningProjectRepo {
  getProjectById(projectId: string): Promise<PlanningProject | null>;
  updateProject(projectId: string, patch: Record<string, unknown>): Promise<unknown>;
}

export interface PlanningWorkstreamRepo {
  createWorkstream(input: PlanningWorkstreamCreateInput): Promise<PlanningWorkstream | null>;
  updateWorkstream(workstreamId: string, patch: Record<string, unknown>): Promise<unknown>;
  getWorkstreamById?(workstreamId: string): Promise<PlanningWorkstream | null>;
}

export interface PlanningTaskRepo {
  createTask(input: PlanningTaskCreateInput): Promise<PlanningTask | null>;
}

export interface PlanningArtifactRepo {
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

export interface PlanningAuditLogRepo {
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

export interface PlanningWorkstreamDefinition {
  name: string;
  objective: string;
  dependencies: string[];
  deliverables: string[];
  ownedPaths: string[];
  assignedAgent?: AgentRole | string | null;
  order?: number;
}

export interface PlanningLlmProvider {
  run(input: { prompt: string; systemPrompt: string; cwd: string }): Promise<{ result: string }>;
  listFiles(cwd: string): Promise<string[]>;
}

export interface PlanningDependencies {
  projectRepo: PlanningProjectRepo;
  workstreamRepo: PlanningWorkstreamRepo;
  taskRepo: PlanningTaskRepo;
  artifactRepo: PlanningArtifactRepo;
  auditLogRepo: PlanningAuditLogRepo;
  implementationQueue: {
    add(name: string, data: Record<string, unknown>, opts?: { jobId?: string }): Promise<unknown>;
  };
  eventBus: {
    emitTyped(event: string, payload: Record<string, unknown>): void;
  };
  createLLMProvider(role: string, provider?: string): PlanningLlmProvider;
  parseArchitecture(result: string): string;
  parseWorkstreams(result: string): PlanningWorkstreamDefinition[];
  buildUserMessage(basePrompt: string, workstream: PlanningWorkstream): string;
  architectPrompts: {
    existingCodebase: string;
    greenfield: string;
  };
}

export type PlanningJobHandler = (job: Job<PlanningJobData>) => Promise<
  | {
      projectId: string;
      workstreamCount: number;
      filesCreated: number;
    }
  | undefined
>;

export interface PlanningGuards {
  canProjectTransition(from: ProjectStatus, to: ProjectStatus): boolean;
  canWorkstreamTransition(from: WorkstreamStatus, to: WorkstreamStatus): boolean;
}
