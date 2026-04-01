export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  mission: string;
  bootstrapAgentRole: "ceo" | "orchestrator";
  bootstrapAgentProvider: "claude" | "codex" | "opencode";
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkspaceInput {
  name: string;
  slug?: string;
  description?: string;
  mission?: string;
  bootstrapAgentRole?: "ceo" | "orchestrator";
  bootstrapAgentProvider?: "claude" | "codex" | "opencode";
}

export interface UpdateWorkspaceInput {
  name?: string;
  slug?: string;
  description?: string;
  mission?: string;
  bootstrapAgentRole?: "ceo" | "orchestrator";
  bootstrapAgentProvider?: "claude" | "codex" | "opencode";
}
