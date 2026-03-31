"use client";

import type { AgentDefinition } from "../lib/api";

const TIER_COLORS: Record<string, string> = {
  ceo: "var(--color-tier-ceo)",
  planner: "var(--color-tier-planner)",
  architect: "var(--color-tier-architect)",
  lead: "var(--color-tier-lead)",
  specialist: "var(--color-tier-specialist)",
  reviewer: "var(--color-tier-reviewer)",
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
    <div className="agent-hierarchy">
      {tiers.map((tier) => {
        const tierAgents = byTier.get(tier);
        if (!tierAgents || tierAgents.length === 0) return null;

        return (
          <section key={tier} className="agent-tier-section card">
            <div className="agent-tier-header">
              <div className="agent-tier-label">
                <span
                  className="agent-tier-dot"
                  style={{ background: TIER_COLORS[tier] || "var(--color-text-muted)" }}
                />
                <strong>{tier}</strong>
              </div>
              <span className="agent-tier-count">
                {tierAgents.length} agent{tierAgents.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="agent-card-grid">
              {tierAgents.map((agent) => (
                <article
                  key={agent.id}
                  className="agent-card"
                  style={{
                    borderLeftColor: TIER_COLORS[tier] || "var(--color-text-muted)",
                  }}
                >
                  <div className="agent-card-top">
                    <div>
                      <h3 className="agent-card-name">{agent.name}</h3>
                      <p className="agent-card-role">
                        {agent.role}
                        {agent.parentRole && ` -> reports to ${agent.parentRole}`}
                      </p>
                    </div>
                    <span className="agent-card-tier">{agent.tier}</span>
                  </div>

                  <div className="agent-card-meta">
                    <span>
                      {agent.provider ? `Provider: ${agent.provider}` : "Provider not set"}
                    </span>
                    <span>
                      {agent.systemPrompt
                        ? "Custom prompt defined"
                        : "Using default prompt behavior"}
                    </span>
                    <span>
                      {agent.capabilities.length > 0
                        ? `${agent.capabilities.length} capabilities`
                        : "No custom capabilities"}
                    </span>
                    <span>Max concurrent tasks: {agent.maxConcurrentTasks}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
