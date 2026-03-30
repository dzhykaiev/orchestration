export type ProjectStatus = "draft" | "planning" | "in_progress" | "completed" | "failed";
export type LLMProviderType = "claude" | "opencode";

export interface Project {
  id: string;
  name: string;
  goal: string;
  status: ProjectStatus;
  architecture?: string;
  provider: LLMProviderType;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateProjectInput {
  name: string;
  goal: string;
  provider?: LLMProviderType;
}

export interface UpdateProjectInput {
  name?: string;
  goal?: string;
  status?: ProjectStatus;
  architecture?: string;
}
