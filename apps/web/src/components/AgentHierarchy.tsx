"use client";

import type { AgentDefinition } from "../lib/api";

const TIER_COLORS: Record<string, string> = {
  ceo: "#ef4444",
  planner: "#f59e0b",
  architect: "#3b82f6",
  lead: "#8b5cf6",
  specialist: "#22c55e",
  reviewer: "#ec4899",
};

export function AgentHierarchy({ agents }: { agents: AgentDefinition[] }) {
  const tiers = ["ceo", "planner", "architect", "lead", "specialist", "reviewer"];
  const byTier = new Map<string, AgentDefinition[]>();
  for (const agent of agents) {
    const list = byTier.get(agent.tier) ?? [];
    list.push(agent);
    byTier.set(agent.tier, list);
  }

  if (agents.length === 0) {
    return (
      <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
          No agent hierarchy configured. Add agents to enable hierarchical orchestration.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {tiers.map((tier) => {
        const tierAgents = byTier.get(tier);
        if (!tierAgents || tierAgents.length === 0) return null;
        return (
          <div key={tier}>
            <div className="flex items-center gap-2" style={{ marginBottom: "0.5rem" }}>
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: TIER_COLORS[tier] || "#6b7280",
                }}
              />
              <strong style={{ fontSize: "0.85rem", textTransform: "capitalize" }}>{tier}</strong>
            </div>
            <div
              className="grid gap-2"
              style={{
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                paddingLeft: "1.25rem",
              }}
            >
              {tierAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="card"
                  style={{
                    padding: "0.75rem",
                    borderLeft: `3px solid ${TIER_COLORS[tier] || "#6b7280"}`,
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{agent.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                    {agent.role}
                    {agent.parentRole && ` → reports to ${agent.parentRole}`}
                  </div>
                  {agent.provider && (
                    <div
                      style={{
                        fontSize: "0.7rem",
                        color: "var(--color-text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      Provider: {agent.provider}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
