import type { CreateAgentDefinitionInput, UpdateAgentDefinitionInput } from "@orchestration/shared";
import { NotFoundError } from "../../domain/common/errors.js";
import type { AgentDefinitionsDependencies } from "./ports.js";

export class AgentDefinitionUseCases {
  constructor(private readonly deps: AgentDefinitionsDependencies) {}

  async listByWorkspace(workspaceId: string) {
    return this.deps.agentDefinitionRepo.listByWorkspace(workspaceId);
  }

  async create(input: CreateAgentDefinitionInput) {
    const agent = await this.deps.agentDefinitionRepo.createAgentDefinition(input);
    if (!agent) {
      throw new Error("Failed to create agent definition");
    }
    return agent;
  }

  async update(id: string, input: UpdateAgentDefinitionInput) {
    const agent = await this.deps.agentDefinitionRepo.updateAgentDefinition(id, input);
    if (!agent) {
      throw new NotFoundError("Agent definition not found");
    }
    return agent;
  }

  async delete(id: string) {
    const agent = await this.deps.agentDefinitionRepo.getById(id);
    if (!agent) {
      throw new NotFoundError("Agent definition not found");
    }
    await this.deps.agentDefinitionRepo.deleteAgentDefinition(id);
  }
}
