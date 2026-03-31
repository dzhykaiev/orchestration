export interface AgentDefinitionRecord {
  id: string;
  [key: string]: unknown;
}

export interface AgentDefinitionRepositoryPort {
  listByWorkspace(workspaceId: string): Promise<AgentDefinitionRecord[]>;
  createAgentDefinition(input: {
    workspaceId: string;
    name: string;
    role: string;
    tier: string;
    promptTemplate?: string;
    modelPreference?: string;
    timeoutSec?: number;
    maxRetries?: number;
    metadata?: Record<string, unknown>;
  }): Promise<AgentDefinitionRecord>;
  updateAgentDefinition(
    id: string,
    input: Partial<{
      name: string;
      role: string;
      tier: string;
      promptTemplate: string;
      modelPreference: string;
      timeoutSec: number;
      maxRetries: number;
      metadata: Record<string, unknown>;
    }>,
  ): Promise<AgentDefinitionRecord | null>;
  getById(id: string): Promise<AgentDefinitionRecord | null>;
  deleteAgentDefinition(id: string): Promise<void>;
}

export interface AgentDefinitionsDependencies {
  agentDefinitionRepo: AgentDefinitionRepositoryPort;
}
