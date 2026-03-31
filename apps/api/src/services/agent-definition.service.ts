import { AgentDefinitionUseCases } from "../application/agent-definitions/agent-definition-use-cases.js";
import type { AgentDefinitionsDependencies } from "../application/agent-definitions/ports.js";
import { NotFoundError } from "../domain/common/errors.js";
import { defaultAgentDefinitionsDependencies } from "../infrastructure/agent-definitions/agent-definition-dependencies.js";

export class AgentDefinitionService extends AgentDefinitionUseCases {
  constructor(deps: AgentDefinitionsDependencies = defaultAgentDefinitionsDependencies) {
    super(deps);
  }
}

export { NotFoundError };

export const agentDefinitionService = new AgentDefinitionService();
