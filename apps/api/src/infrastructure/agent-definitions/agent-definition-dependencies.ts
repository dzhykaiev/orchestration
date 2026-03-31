import { agentDefinitionRepo } from "@orchestration/db";
import type { AgentDefinitionsDependencies } from "../../application/agent-definitions/ports.js";

export const defaultAgentDefinitionsDependencies: AgentDefinitionsDependencies = {
  agentDefinitionRepo,
};
