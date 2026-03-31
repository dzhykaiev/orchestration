import type { CreateAgentDefinitionInput, UpdateAgentDefinitionInput } from "@orchestration/shared";

export interface AgentDefinitionRecord {
  id: string;
  [key: string]: unknown;
}

export interface AgentDefinitionRepositoryPort {
  listByWorkspace(workspaceId: string): Promise<AgentDefinitionRecord[]>;
  createAgentDefinition(input: CreateAgentDefinitionInput): Promise<AgentDefinitionRecord | null>;
  updateAgentDefinition(
    id: string,
    input: UpdateAgentDefinitionInput,
  ): Promise<AgentDefinitionRecord | null>;
  getById(id: string): Promise<AgentDefinitionRecord | null>;
  deleteAgentDefinition(id: string): Promise<void>;
}

export interface AgentDefinitionsDependencies {
  agentDefinitionRepo: AgentDefinitionRepositoryPort;
}
