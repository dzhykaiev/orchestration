import type { AgentRole, AgentTier } from "./agent-task.js";

export interface AgentDefinition {
  id: string;
  workspaceId: string;
  role: AgentRole;
  tier: AgentTier;
  parentRole: AgentRole | null;
  name: string;
  systemPrompt: string | null;
  capabilities: string[];
  maxConcurrentTasks: number;
  provider: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentDefinitionInput {
  workspaceId: string;
  role: AgentRole;
  tier: AgentTier;
  parentRole?: AgentRole;
  name: string;
  systemPrompt?: string;
  capabilities?: string[];
  maxConcurrentTasks?: number;
  provider?: string;
}

export interface UpdateAgentDefinitionInput {
  name?: string;
  systemPrompt?: string;
  capabilities?: string[];
  maxConcurrentTasks?: number;
  provider?: string;
  parentRole?: AgentRole;
}
