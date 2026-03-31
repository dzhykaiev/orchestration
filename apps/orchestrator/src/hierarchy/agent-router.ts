import { agentDefinitionRepo } from "@orchestration/db";
import type { AgentRole, AgentTier } from "@orchestration/shared";

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

export function roleToTier(role: AgentRole): AgentTier {
  return DEFAULT_ROLE_TO_TIER[role] ?? "specialist";
}

export function getTierOrder(tier: AgentTier): number {
  return TIER_ORDER.indexOf(tier);
}

export function getParentTier(tier: AgentTier): AgentTier | null {
  const idx = TIER_ORDER.indexOf(tier);
  if (idx <= 0) return null;
  return TIER_ORDER[idx - 1] ?? null;
}

export async function getWorkspaceHierarchy(workspaceId: string) {
  const definitions = await agentDefinitionRepo.listByWorkspace(workspaceId);
  if (definitions.length === 0) return null;

  const byRole = new Map(definitions.map((d) => [d.role, d]));
  const byTier = new Map<string, typeof definitions>();

  for (const def of definitions) {
    const existing = byTier.get(def.tier) ?? [];
    existing.push(def);
    byTier.set(def.tier, existing);
  }

  return { definitions, byRole, byTier };
}

export function isHierarchicalWorkspace(
  hierarchy: Awaited<ReturnType<typeof getWorkspaceHierarchy>>,
): hierarchy is NonNullable<typeof hierarchy> {
  return hierarchy !== null;
}
