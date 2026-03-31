import type { AgentRole, AgentTier } from "@orchestration/shared";

export interface AgentDefinition {
  role: AgentRole;
  tier: AgentTier;
}

export interface AgentHierarchy {
  definitions: AgentDefinition[];
  byRole: Map<AgentRole, AgentDefinition>;
  byTier: Map<AgentTier, AgentDefinition[]>;
}

export interface HierarchyDependencies {
  listWorkspaceDefinitions(workspaceId: string): Promise<AgentDefinition[]>;
}

export interface HierarchyService {
  roleToTier(role: AgentRole): AgentTier;
  getTierOrder(tier: AgentTier): number;
  getParentTier(tier: AgentTier): AgentTier | null;
  getWorkspaceHierarchy(workspaceId: string): Promise<AgentHierarchy | null>;
  isHierarchicalWorkspace(hierarchy: AgentHierarchy | null): hierarchy is AgentHierarchy;
}
