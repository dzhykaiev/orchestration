import type { AgentRole, AgentTier } from "@orchestration/shared";
import type { AgentHierarchy, HierarchyDependencies, HierarchyService } from "./ports.js";

const TIER_ORDER: AgentTier[] = ["ceo", "planner", "architect", "lead", "specialist", "reviewer"];

const DEFAULT_ROLE_TO_TIER: Record<string, AgentTier> = {
  ceo: "ceo",
  planner: "planner",
  architect: "architect",
  lead: "lead",
  backend: "specialist",
  frontend: "specialist",
  data: "specialist",
  devops: "specialist",
  qa: "specialist",
  reviewer: "reviewer",
};

export function createHierarchyService(deps: HierarchyDependencies): HierarchyService {
  return {
    roleToTier(role: AgentRole): AgentTier {
      return DEFAULT_ROLE_TO_TIER[role] ?? "specialist";
    },

    getTierOrder(tier: AgentTier): number {
      return TIER_ORDER.indexOf(tier);
    },

    getParentTier(tier: AgentTier): AgentTier | null {
      const idx = TIER_ORDER.indexOf(tier);
      if (idx <= 0) return null;
      return TIER_ORDER[idx - 1] ?? null;
    },

    async getWorkspaceHierarchy(workspaceId: string): Promise<AgentHierarchy | null> {
      const definitions = await deps.listWorkspaceDefinitions(workspaceId);
      if (definitions.length === 0) return null;

      const byRole = new Map(definitions.map((d) => [d.role, d]));
      const byTier = new Map<AgentTier, typeof definitions>();

      for (const def of definitions) {
        const existing = byTier.get(def.tier) ?? [];
        existing.push(def);
        byTier.set(def.tier, existing);
      }

      return { definitions, byRole, byTier };
    },

    isHierarchicalWorkspace(hierarchy: AgentHierarchy | null): hierarchy is AgentHierarchy {
      return hierarchy !== null;
    },
  };
}
