"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AgentHierarchy } from "../../../../components/AgentHierarchy";
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
      <div className="flex items-center gap-2" style={{ marginBottom: "0.5rem" }}>
        <Link
          href={`/workspaces/${id}`}
          style={{
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            fontSize: "0.85rem",
          }}
        >
          {workspace.name}
        </Link>
        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>/</span>
        <span style={{ fontSize: "0.85rem" }}>Agents</span>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ margin: 0 }}>Agent Hierarchy</h2>
        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          Add Agent
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: "1.25rem", marginBottom: "1.5rem" }}>
          <form onSubmit={handleCreate} className="flex flex-col gap-3">
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
            <div className="grid gap-3" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
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
            <div className="flex gap-2">
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

      <AgentHierarchy agents={agents} />
    </div>
  );
}
