export type ProjectStatus =
  | "draft"
  | "planning"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled"
  | "archived";
export type LLMProviderType = "claude" | "opencode";
export type ProjectMode = "greenfield" | "existing";

export interface Project {
  id: string;
  workspaceId: string | null;
  name: string;
  goal: string;
  status: ProjectStatus;
  architecture?: string;
  provider: LLMProviderType;
  totalCostUsd: string;
  repoUrl?: string;
  repoPath?: string;
  projectMode: ProjectMode;
  workBranch?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  goal: string;
  workspaceId?: string;
  provider?: LLMProviderType;
  repoUrl?: string;
  repoPath?: string;
  projectMode?: ProjectMode;
}

export interface UpdateProjectInput {
  name?: string;
  goal?: string;
  status?: ProjectStatus;
  architecture?: string;
  provider?: LLMProviderType;
  workBranch?: string;
}
