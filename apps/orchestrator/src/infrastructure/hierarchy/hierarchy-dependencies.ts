import { agentDefinitionRepo } from "@orchestration/db";
import type { HierarchyDependencies } from "../../application/hierarchy/ports.js";

export const defaultHierarchyDependencies: HierarchyDependencies = {
  async listWorkspaceDefinitions(workspaceId) {
    const definitions = await agentDefinitionRepo.listByWorkspace(workspaceId);
    return definitions.map((def) => ({
      role: def.role,
      tier: def.tier,
    }));
  },
};
