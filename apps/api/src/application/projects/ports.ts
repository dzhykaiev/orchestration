import type {
  CreateAuditLogInput,
  CreateProjectInput,
  LLMProviderType,
  ProjectStatus,
  UpdateProjectInput,
} from "@orchestration/shared";

export interface ListProjectsQuery {
  limit: number;
  offset: number;
  includeArchived: boolean;
  status?: string;
  provider?: string;
  workspaceId?: string;
}

export interface CostBreakdown {
  total: number;
  byWorkstream: Array<{ workstreamId: string; name: string; cost: number }>;
  byRole: Array<{ role: string; cost: number }>;
  taskCount: number;
}

export interface ProjectRecord {
  id: string;
  goal: string;
  status: ProjectStatus;
  provider: string | null;
  [key: string]: unknown;
}

export interface WorkstreamRecord {
  id: string;
  [key: string]: unknown;
}

export interface TaskRecord {
  id: string;
  [key: string]: unknown;
}

export interface FeatureRecord {
  id: string;
  [key: string]: unknown;
}

export interface ProjectRepositoryPort {
  listProjects(opts: ListProjectsQuery): Promise<{ data: ProjectRecord[]; total: number }>;
  getProjectById(id: string): Promise<ProjectRecord | null>;
  createProject(input: CreateProjectInput): Promise<ProjectRecord | null>;
  updateProject(id: string, input: UpdateProjectInput): Promise<ProjectRecord | null>;
  transitionStatus(
    id: string,
    from: ProjectStatus,
    to: ProjectStatus,
  ): Promise<ProjectRecord | null>;
  deleteProject(id: string): Promise<void>;
  getCostBreakdown(projectId: string): Promise<CostBreakdown>;
}

export interface WorkstreamRepositoryPort {
  listWorkstreamsByProject(projectId: string): Promise<WorkstreamRecord[]>;
  cancelWorkstreamsByProject(projectId: string): Promise<WorkstreamRecord[]>;
}

export interface TaskRepositoryPort {
  listTasksByProject(projectId: string): Promise<TaskRecord[]>;
  cancelTasksByProject(projectId: string): Promise<TaskRecord[]>;
}

export interface FeatureRepositoryPort {
  getFeatureByProjectId(projectId: string): Promise<FeatureRecord | null>;
}

export interface AuditLogRepositoryPort {
  createAuditLog(input: CreateAuditLogInput): Promise<unknown>;
}

export interface QueueJobPort {
  data?: { projectId?: string };
  remove(): Promise<void>;
}

export interface ProjectQueuePort {
  add(name: string, data: unknown): Promise<unknown>;
  getJobs(types: Array<"waiting" | "delayed" | "prioritized">): Promise<QueueJobPort[]>;
}

export interface ProjectsDependencies {
  projectRepo: ProjectRepositoryPort;
  workstreamRepo: WorkstreamRepositoryPort;
  taskRepo: TaskRepositoryPort;
  featureRepo: FeatureRepositoryPort;
  auditLogRepo: AuditLogRepositoryPort;
  resolveProvider: (projectProvider?: string | null) => LLMProviderType;
  assertProjectTransition: (from: ProjectStatus, to: ProjectStatus) => void;
}
