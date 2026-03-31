"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AgentHierarchy } from "../../../../components/AgentHierarchy";
import { Breadcrumbs } from "../../../../components/Breadcrumbs";
import { useToastContext } from "../../../../components/ui/ToastProvider";
import {
  type AgentDefinition,
  type Workspace,
  api,
  getErrorDetails,
  getErrorFieldErrors,
  getErrorMessage,
} from "../../../../lib/api";

const TIER_OPTIONS = ["ceo", "planner", "architect", "lead", "specialist", "reviewer"] as const;
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
] as const;
const CORE_ROLES = ["planner", "architect", "lead", "backend", "frontend", "reviewer"] as const;

const ROLE_TIER_MAP: Record<AgentDefinition["role"], AgentDefinition["tier"]> = {
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

const ROLE_PARENT_MAP: Record<AgentDefinition["role"], AgentDefinition["parentRole"]> = {
  ceo: null,
  planner: "ceo",
  architect: "ceo",
  lead: "architect",
  backend: "lead",
  frontend: "lead",
  data: "lead",
  devops: "lead",
  qa: "lead",
  reviewer: "lead",
};

function titleCaseRole(role: AgentDefinition["role"]): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function getRolePreset(role: AgentDefinition["role"]) {
  return {
    role,
    tier: ROLE_TIER_MAP[role],
    parentRole: ROLE_PARENT_MAP[role] ?? "",
  };
}

function getFieldError(fieldErrors: Record<string, string[]>, field: string) {
  return fieldErrors[field]?.[0];
}

function buildInferredAgents(
  workspaceId: string,
  roles: Set<AgentDefinition["role"]>,
): AgentDefinition[] {
  const now = new Date().toISOString();
  return ROLE_OPTIONS.filter((role): role is AgentDefinition["role"] =>
    roles.has(role as AgentDefinition["role"]),
  ).map((role) => ({
    id: `inferred-${workspaceId}-${role}`,
    workspaceId,
    role,
    tier: ROLE_TIER_MAP[role],
    parentRole: ROLE_PARENT_MAP[role],
    name: `${titleCaseRole(role)} (inferred)`,
    systemPrompt: null,
    capabilities: [],
    maxConcurrentTasks: 1,
    provider: null,
    createdAt: now,
    updatedAt: now,
  }));
}

export default function WorkspaceAgentsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [usingInferredAgents, setUsingInferredAgents] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string | undefined>();
  const [actionError, setActionError] = useState<{ message: string; details?: string } | null>(
    null,
  );
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectCount, setProjectCount] = useState(0);
  const [activeProjectCount, setActiveProjectCount] = useState(0);
  const [featureCount, setFeatureCount] = useState(0);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [form, setForm] = useState({
    name: "",
    role: "backend" as AgentDefinition["role"],
    tier: "specialist" as AgentDefinition["tier"],
    parentRole: "lead",
  });

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    try {
      const [wsRes, agRes, projectsRes, featuresRes] = await Promise.all([
        api.workspaces.get(id),
        api.workspaces.agents(id),
        api.workspaces.projects(id, 100, 0, true),
        api.workspaces.features(id, 100, 0),
      ]);

      setWorkspace(wsRes.workspace);
      setProjectCount(projectsRes.total);
      setActiveProjectCount(
        projectsRes.data.filter((project) => ["planning", "in_progress"].includes(project.status))
          .length,
      );
      setFeatureCount(featuresRes.total);

      if (agRes.agents.length > 0) {
        setAgents(agRes.agents);
        setUsingInferredAgents(false);
      } else {
        const details = await Promise.allSettled(
          projectsRes.data.map((project) => api.projects.detail(project.id)),
        );

        const discoveredRoles = new Set<AgentDefinition["role"]>();
        for (const detailResult of details) {
          if (detailResult.status !== "fulfilled") continue;
          for (const task of detailResult.value.tasks) {
            discoveredRoles.add(task.role);
          }
        }

        if (discoveredRoles.size > 0) {
          setAgents(buildInferredAgents(id, discoveredRoles));
          setUsingInferredAgents(true);
        } else {
          setAgents([]);
          setUsingInferredAgents(false);
        }
      }

      setLoadError(null);
      setLoadErrorDetails(undefined);
    } catch (error) {
      setWorkspace(null);
      setAgents([]);
      setUsingInferredAgents(false);
      setLoadError(getErrorMessage(error, "Failed to load workspace agents"));
      setLoadErrorDetails(getErrorDetails(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const presentRoles = useMemo(() => new Set(agents.map((agent) => agent.role)), [agents]);
  const missingCoreRoles = CORE_ROLES.filter((role) => !presentRoles.has(role));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSubmitting(true);
    setActionError(null);
    setFieldErrors({});

    try {
      const { agent } = await api.workspaces.createAgent(id, {
        name: form.name.trim(),
        role: form.role,
        tier: form.tier,
        parentRole: form.parentRole || undefined,
      });
      setAgents((prev) => [...prev, agent]);
      setUsingInferredAgents(false);
      setShowForm(false);
      setForm({
        name: "",
        role: "backend",
        tier: "specialist",
        parentRole: "lead",
      });
      toast.success(`Agent created: ${agent.name}`);
    } catch (error) {
      setFieldErrors(getErrorFieldErrors(error));
      setActionError({
        message: getErrorMessage(error, "Failed to create agent"),
        details: getErrorDetails(error),
      });
      toast.error({
        title: "Agent creation failed",
        message: getErrorMessage(error, "Failed to create agent"),
        details: getErrorDetails(error),
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="skeleton" style={{ height: 260 }} />;
  }

  if (loadError || !workspace) {
    return (
      <div className="project-load-error">
        <div className="error-banner" role="alert">
          <strong>Agent page failed to load</strong>
          <div>{loadError ?? "Workspace not found"}</div>
          {loadErrorDetails && <pre className="error-banner-details">{loadErrorDetails}</pre>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={() => void load()}>
            Retry
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push(`/workspaces/${id}`)}
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workspace-shell">
      <Breadcrumbs
        items={[
          { label: "Workspaces", href: "/workspaces" },
          { label: workspace.name, href: `/workspaces/${id}` },
          { label: "Agents" },
        ]}
      />

      <div className="workspace-overview card">
        <div className="workspace-overview-copy">
          <p className="workspace-overview-eyebrow">Workspace operating model</p>
          <h1 className="ws-page-title">Agent Hierarchy</h1>
          <p className="ws-page-subtitle">
            Define who plans, who leads execution, and which specialists the workspace can delegate
            to. Explicit agents are useful when you need stable prompts and reliable routing.
          </p>
          <div className="workspace-meta-row">
            <span className="workspace-meta-pill">
              Source: {usingInferredAgents ? "Inferred from task history" : "Manual definitions"}
            </span>
            <span className="workspace-meta-pill">{projectCount} projects analyzed</span>
            <span className="workspace-meta-pill">{featureCount} workspace features</span>
          </div>
          <div className="workspace-detail-actions">
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              Add Agent
            </button>
            <Link href={`/workspaces/${id}`} className="btn btn-secondary">
              Back to Workspace
            </Link>
          </div>
        </div>

        <div className="workspace-overview-stats" aria-label="Agent hierarchy summary">
          <div className="workspace-stat-card stat-total">
            <div className="workspace-stat-value">{agents.length}</div>
            <div className="workspace-stat-label">
              {usingInferredAgents ? "Inferred roles" : "Configured agents"}
            </div>
          </div>
          <div className="workspace-stat-card stat-active">
            <div className="workspace-stat-value">{activeProjectCount}</div>
            <div className="workspace-stat-label">Active projects</div>
          </div>
          <div className="workspace-stat-card stat-completed">
            <div className="workspace-stat-value">{presentRoles.size}</div>
            <div className="workspace-stat-label">Roles covered</div>
          </div>
          <div className="workspace-stat-card stat-failed">
            <div className="workspace-stat-value">{missingCoreRoles.length}</div>
            <div className="workspace-stat-label">Core gaps</div>
          </div>
        </div>
      </div>

      {actionError && (
        <div className="error-banner" role="alert">
          <strong>Agent action failed</strong>
          <div>{actionError.message}</div>
          {actionError.details && <pre className="error-banner-details">{actionError.details}</pre>}
        </div>
      )}

      <section className="workspace-context-grid">
        <div className="card workspace-context-card">
          <p className="workspace-card-eyebrow">Coverage</p>
          <div className="agent-role-chip-list">
            {presentRoles.size > 0 ? (
              [...presentRoles].map((role) => (
                <span key={role} className="agent-role-chip active">
                  {role}
                </span>
              ))
            ) : (
              <span className="agent-role-chip">No roles yet</span>
            )}
          </div>
          {missingCoreRoles.length > 0 && (
            <p className="workspace-inline-note">
              Missing core roles: {missingCoreRoles.join(", ")}.
            </p>
          )}
        </div>

        <div className="card workspace-context-card">
          <p className="workspace-card-eyebrow">When to define agents</p>
          <ul className="workspace-context-list">
            <li>
              <span>Use explicit agents</span>
              <strong>When prompts and role boundaries must stay stable</strong>
            </li>
            <li>
              <span>Use inferred hierarchy</span>
              <strong>When you want to inspect how the workspace has behaved so far</strong>
            </li>
            <li>
              <span>Best first additions</span>
              <strong>Architect, Lead, Backend, Frontend, Reviewer</strong>
            </li>
          </ul>
        </div>
      </section>

      {showForm && (
        <div className="workspace-create-card">
          <h3>Add New Agent</h3>
          <p className="workspace-form-note">
            Start with the operational role this agent should play. The suggested tier and reporting
            line update automatically, but you can override them if your hierarchy is different.
          </p>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="agent-name">
                Name
              </label>
              <input
                id="agent-name"
                className="input"
                value={form.name}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, name: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, name: [] }));
                }}
                placeholder="e.g. Backend Specialist"
                required
              />
              <p className="field-hint">
                Use a role name the team will understand in activity logs and delegation trails.
              </p>
              {getFieldError(fieldErrors, "name") && (
                <p className="field-error">{getFieldError(fieldErrors, "name")}</p>
              )}
            </div>

            <div className="workspace-agent-form-grid">
              <div>
                <label className="label" htmlFor="agent-role">
                  Role
                </label>
                <select
                  id="agent-role"
                  className="input"
                  value={form.role}
                  onChange={(e) => {
                    const nextRole = e.target.value as AgentDefinition["role"];
                    setForm((prev) => ({
                      ...prev,
                      ...getRolePreset(nextRole),
                    }));
                    setFieldErrors((prev) => ({ ...prev, role: [], tier: [], parentRole: [] }));
                  }}
                >
                  {ROLE_OPTIONS.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  Defines what kind of work this agent is expected to own.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="agent-tier">
                  Tier
                </label>
                <select
                  id="agent-tier"
                  className="input"
                  value={form.tier}
                  onChange={(e) => {
                    setForm((prev) => ({
                      ...prev,
                      tier: e.target.value as AgentDefinition["tier"],
                    }));
                    setFieldErrors((prev) => ({ ...prev, tier: [] }));
                  }}
                >
                  {TIER_OPTIONS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  Higher tiers coordinate work. Specialist and reviewer tiers usually execute.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="agent-parent">
                  Reports to
                </label>
                <select
                  id="agent-parent"
                  className="input"
                  value={form.parentRole}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, parentRole: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, parentRole: [] }));
                  }}
                >
                  <option value="">None</option>
                  {ROLE_OPTIONS.filter((role) => role !== form.role).map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  Use the reporting line to shape delegation and escalation flow.
                </p>
              </div>
            </div>

            {(getFieldError(fieldErrors, "role") ||
              getFieldError(fieldErrors, "tier") ||
              getFieldError(fieldErrors, "parentRole")) && (
              <div className="field-error">
                {getFieldError(fieldErrors, "role") ||
                  getFieldError(fieldErrors, "tier") ||
                  getFieldError(fieldErrors, "parentRole")}
              </div>
            )}

            <div className="flex gap-2" style={{ marginTop: "0.25rem" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !form.name.trim()}
              >
                {submitting ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setShowForm(false);
                  setActionError(null);
                  setFieldErrors({});
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {usingInferredAgents && (
        <div className="workspace-info-banner">
          <p>
            Showing inferred hierarchy from existing task history. Create workspace agent
            definitions if you need stable prompts, explicit providers, or predictable delegation.
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => setShowForm(true)}>
            Create Explicit Agent
          </button>
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
              <title>Agent hierarchy icon</title>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </div>
          <h3 className="agents-empty-title">No agent hierarchy yet</h3>
          <p className="agents-empty-desc">
            Define explicit agents if this workspace needs stable delegation rules, or run a project
            first so the system can infer the working roles from task history.
          </p>
          <div className="home-empty-actions">
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              Add Agent
            </button>
            <Link href="/projects/new" className="btn btn-secondary">
              Create Project
            </Link>
          </div>
        </div>
      ) : (
        <AgentHierarchy agents={agents} />
      )}
    </div>
  );
}
