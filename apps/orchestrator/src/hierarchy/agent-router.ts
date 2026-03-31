import type { AgentRole, AgentTier } from "@orchestration/shared";
import { createHierarchyService } from "../application/hierarchy/hierarchy-use-cases.js";
import type { AgentHierarchy } from "../application/hierarchy/ports.js";
import { defaultHierarchyDependencies } from "../infrastructure/hierarchy/hierarchy-dependencies.js";

const hierarchyService = createHierarchyService(defaultHierarchyDependencies);

export function roleToTier(role: AgentRole): AgentTier {
  return hierarchyService.roleToTier(role);
}

export function getTierOrder(tier: AgentTier): number {
  return hierarchyService.getTierOrder(tier);
}

export function getParentTier(tier: AgentTier): AgentTier | null {
  return hierarchyService.getParentTier(tier);
}

export async function getWorkspaceHierarchy(workspaceId: string) {
  return hierarchyService.getWorkspaceHierarchy(workspaceId);
}

export function isHierarchicalWorkspace(
  hierarchy: Awaited<ReturnType<typeof getWorkspaceHierarchy>> | AgentHierarchy | null,
): hierarchy is AgentHierarchy {
  return hierarchyService.isHierarchicalWorkspace(hierarchy);
}
