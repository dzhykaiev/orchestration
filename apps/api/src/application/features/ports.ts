import type {
  CreateAuditLogInput,
  CreateFeatureInput,
  FeatureStatus,
  LLMProviderType,
  UpdateFeatureInput,
} from "@orchestration/shared";

export interface FeatureRecord {
  id: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  workspaceId: string | null;
  assigneeMode?: string | null;
  assigneeAgentDefinitionId?: string | null;
  orchestrationProjectId: string | null;
  [key: string]: unknown;
}

export interface ProjectRecord {
  id: string;
  goal: string;
  provider: string | null;
  [key: string]: unknown;
}

export interface ListFeaturesQuery {
  status?: string;
  type?: string;
  workspaceId?: string;
  sourceProjectId?: string;
  assigneeMode?: string;
  assigneeAgentDefinitionId?: string;
  limit: number;
  offset: number;
}

export interface FeatureRepositoryPort {
  listFeatures(opts: ListFeaturesQuery): Promise<{ data: FeatureRecord[]; total: number }>;
  getFeatureById(id: string): Promise<FeatureRecord | null>;
  createFeature(input: CreateFeatureInput): Promise<FeatureRecord>;
  updateFeature(id: string, input: UpdateFeatureInput): Promise<FeatureRecord | null>;
  deleteFeature(id: string): Promise<void>;
  reorderFeatures(updates: { id: string; sortOrder: number }[]): Promise<void>;
}

export interface AgentDefinitionRecord {
  id: string;
  workspaceId: string;
  [key: string]: unknown;
}

export interface AgentDefinitionRepositoryPort {
  getById(id: string): Promise<AgentDefinitionRecord | null>;
}

export interface ProjectRepositoryPort {
  createProject(input: {
    name: string;
    goal: string;
    workspaceId: string;
    projectMode: "existing";
    repoPath: string;
  }): Promise<ProjectRecord | null>;
  deleteProject(id: string): Promise<void>;
}

export interface AuditLogRepositoryPort {
  createAuditLog(input: CreateAuditLogInput): Promise<unknown>;
}

export interface PlanningQueuePort {
  add(name: string, data: unknown): Promise<unknown>;
}

export interface FeaturesDependencies {
  featureRepo: FeatureRepositoryPort;
  agentDefinitionRepo: AgentDefinitionRepositoryPort;
  projectRepo: ProjectRepositoryPort;
  auditLogRepo: AuditLogRepositoryPort;
  resolveProvider: (projectProvider?: string | null) => LLMProviderType;
  assertFeatureTransition: (from: FeatureStatus, to: FeatureStatus) => void;
}
