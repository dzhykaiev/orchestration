"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentHierarchy } from "../../../../components/AgentHierarchy";
import { Breadcrumbs } from "../../../../components/Breadcrumbs";
import { type AgentDefinition, type Workspace, api } from "../../../../lib/api";

const TIER_OPTIONS = ["ceo", "planner", "architect", "lead", "specialist", "reviewer"];
const ROLE_OPTIONS = [
  "ceo",
  "planner",
  "architect",
  "lead",
  "backend",
  "frontend",
  "data",
  "devops",
  "qa",
  "reviewer",
];

export default function WorkspaceAgentsPage() {
  const { id } = useParams<{ id: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    role: "backend",
    tier: "specialist",
    parentRole: "",
  });

  useEffect(() => {
    if (!id) return;
    Promise.all([api.workspaces.get(id), api.workspaces.agents(id)]).then(([wsRes, agRes]) => {
      setWorkspace(wsRes.workspace);
      setAgents(agRes.agents);
      setLoading(false);
    });
  }, [id]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    const { agent } = await api.workspaces.createAgent(id, {
      name: form.name,
      role: form.role,
      tier: form.tier,
      parentRole: form.parentRole || undefined,
    });
    setAgents((prev) => [...prev, agent]);
    setShowForm(false);
    setForm({ name: "", role: "backend", tier: "specialist", parentRole: "" });
  };

  if (loading || !workspace) {
    return <div className="skeleton" style={{ height: 200 }} />;
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: "Workspaces", href: "/workspaces" },
          { label: workspace.name, href: `/workspaces/${id}` },
          { label: "Agents" },
        ]}
      />

      <div className="ws-page-header">
        <div className="ws-page-header-row">
          <div>
            <h2 className="ws-page-title">Agent Hierarchy</h2>
            <p className="ws-page-subtitle">Manage AI agents and their reporting structure</p>
          </div>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            Add Agent
          </button>
        </div>
      </div>

      {showForm && (
        <div className="workspace-create-card">
          <h3>Add New Agent</h3>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="agent-name">
                Name
              </label>
              <input
                id="agent-name"
                className="input"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Backend Specialist"
                required
              />
            </div>
            <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
              <div>
                <label className="label" htmlFor="agent-role">
                  Role
                </label>
                <select
                  id="agent-role"
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="agent-tier">
                  Tier
                </label>
                <select
                  id="agent-tier"
                  className="input"
                  value={form.tier}
                  onChange={(e) => setForm({ ...form, tier: e.target.value })}
                >
                  {TIER_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="agent-parent">
                  Reports to
                </label>
                <select
                  id="agent-parent"
                  className="input"
                  value={form.parentRole}
                  onChange={(e) => setForm({ ...form, parentRole: e.target.value })}
                >
                  <option value="">None</option>
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2" style={{ marginTop: "0.25rem" }}>
              <button type="submit" className="btn btn-primary" disabled={!form.name.trim()}>
                Create
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {agents.length === 0 ? (
        <div className="agents-empty">
          <div className="agents-empty-icon" aria-hidden="true">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 className="agents-empty-title">No agents configured</h3>
          <p className="agents-empty-desc">
            Add your first agent to start building the team hierarchy.
          </p>
        </div>
      ) : (
        <AgentHierarchy agents={agents} />
      )}
    </div>
  );
}
