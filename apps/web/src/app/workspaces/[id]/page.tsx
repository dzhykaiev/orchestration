"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { ConfirmModal } from "../../../components/ui/ConfirmModal";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { useToastContext } from "../../../components/ui/ToastProvider";
import {
  type AgentDefinition,
  type Feature,
  type Project,
  type Workspace,
  api,
  getErrorDetails,
  getErrorFieldErrors,
  getErrorMessage,
} from "../../../lib/api";
import { timeAgo } from "../../../lib/utils";
import { buildBoardHref } from "../../../lib/workspaceNavigation";

function getFieldError(fieldErrors: Record<string, string[]>, field: string) {
  return fieldErrors[field]?.[0];
}

function getWorkspaceGuidance({
  workspaceId,
  featureCount,
  readyFeatureCount,
  activeProjectCount,
  projectCount,
}: {
  workspaceId: string;
  featureCount: number;
  readyFeatureCount: number;
  activeProjectCount: number;
  projectCount: number;
}) {
  if (featureCount === 0 && projectCount === 0) {
    return {
      eyebrow: "Workspace setup",
      title: "Capture the first work before you run agents",
      description:
        "Start on the feature board if you want a prioritized backlog, or create a project directly if the scope is already clear.",
      actions: [
        {
          href: buildBoardHref(workspaceId),
          label: "Open Feature Board",
          variant: "primary" as const,
        },
        { href: "/projects/new", label: "Create Project", variant: "secondary" as const },
      ],
    };
  }

  if (activeProjectCount > 0) {
    return {
      eyebrow: "Execution active",
      title: "Monitor the running projects in this workspace",
      description:
        "Review active runs, unblock failures quickly, and use the board to prepare the next batch of work without interrupting current execution.",
      actions: [
        {
          href: buildBoardHref(workspaceId),
          label: "Review Feature Board",
          variant: "primary" as const,
        },
        { href: "/workspaces", label: "All Workspaces", variant: "secondary" as const },
      ],
    };
  }

  if (readyFeatureCount > 0) {
    return {
      eyebrow: "Ready to launch",
      title: "Kick off the features that are already queued",
      description:
        "This workspace already has prioritized features waiting for execution. Use the board to review them and launch the right project next.",
      actions: [
        {
          href: buildBoardHref(workspaceId),
          label: "Kick Off Features",
          variant: "primary" as const,
        },
        { href: "/projects/new", label: "Create Project", variant: "secondary" as const },
      ],
    };
  }

  if (featureCount > 0) {
    return {
      eyebrow: "Backlog in place",
      title: "Refine the queue before starting the next run",
      description:
        "You already have captured feature work. Move items into the ready state on the board or create a direct project brief for immediate execution.",
      actions: [
        {
          href: buildBoardHref(workspaceId),
          label: "Prioritize Features",
          variant: "primary" as const,
        },
        { href: "/projects/new", label: "Create Project", variant: "secondary" as const },
      ],
    };
  }

  return {
    eyebrow: "Workspace healthy",
    title: "Choose the next outcome for this workspace",
    description:
      "Projects exist, but there is no queued feature work. Add work to the board or define a new project brief for the next execution cycle.",
    actions: [
      {
        href: buildBoardHref(workspaceId),
        label: "Open Feature Board",
        variant: "primary" as const,
      },
      { href: "/projects/new", label: "Create Project", variant: "secondary" as const },
    ],
  };
}

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToastContext();

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [features, setFeatures] = useState<Feature[]>([]);
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string | undefined>();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [actionError, setActionError] = useState<{ message: string; details?: string } | null>(
    null,
  );

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      const [wsRes, projRes, featureRes, agentRes] = await Promise.all([
        api.workspaces.get(id),
        api.workspaces.projects(id, 100, 0, false),
        api.workspaces.features(id, 100, 0),
        api.workspaces.agents(id),
      ]);

      setWorkspace(wsRes.workspace);
      setProjects(projRes.data);
      setTotal(projRes.total);
      setFeatures(featureRes.data);
      setAgents(agentRes.agents);
      setEditName(wsRes.workspace.name);
      setEditDesc(wsRes.workspace.description || "");
      setLoadError(null);
      setLoadErrorDetails(undefined);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load workspace"));
      setLoadErrorDetails(getErrorDetails(error));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    setActionError(null);
    setFieldErrors({});

    try {
      const { workspace: updated } = await api.workspaces.update(id, {
        name: editName,
        description: editDesc || undefined,
      });
      setWorkspace(updated);
      setEditName(updated.name);
      setEditDesc(updated.description || "");
      setEditing(false);
      toast.success("Workspace updated");
    } catch (error) {
      setFieldErrors(getErrorFieldErrors(error));
      setActionError({
        message: getErrorMessage(error, "Failed to update workspace"),
        details: getErrorDetails(error),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    setDeleting(true);
    setActionError(null);

    try {
      await api.workspaces.delete(id);
      toast.success("Workspace deleted");
      router.push("/workspaces");
    } catch (error) {
      setActionError({
        message: getErrorMessage(error, "Failed to delete workspace"),
        details: getErrorDetails(error),
      });
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: "1rem" }} />
        <div className="skeleton" style={{ height: 240 }} />
      </div>
    );
  }

  if (loadError || !workspace) {
    return (
      <div className="project-load-error">
        <div className="error-banner" role="alert">
          <strong>Workspace page failed to load</strong>
          <div>{loadError ?? "Workspace not found"}</div>
          {loadErrorDetails && <pre className="error-banner-details">{loadErrorDetails}</pre>}
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
          <button type="button" className="btn btn-primary" onClick={() => void fetchData()}>
            Retry
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => router.push("/workspaces")}
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  const activeProjects = projects.filter((project) =>
    ["planning", "in_progress"].includes(project.status),
  ).length;
  const completedProjects = projects.filter((project) => project.status === "completed").length;
  const failedProjects = projects.filter((project) => project.status === "failed").length;
  const readyFeatures = features.filter((feature) => feature.status === "todo").length;
  const inProgressFeatures = features.filter((feature) => feature.status === "in_progress").length;
  const linkedFeatures = features.filter((feature) => feature.orchestrationProjectId).length;
  const workspaceGuidance = getWorkspaceGuidance({
    workspaceId: id,
    featureCount: features.length,
    readyFeatureCount: readyFeatures,
    activeProjectCount: activeProjects,
    projectCount: projects.length,
  });

  return (
    <div className="workspace-shell">
      <Breadcrumbs
        items={[{ label: "Workspaces", href: "/workspaces" }, { label: workspace.name }]}
      />

      <section className="workspace-overview card">
        <div className="workspace-overview-copy">
          <p className="workspace-overview-eyebrow">{workspaceGuidance.eyebrow}</p>
          <h1 className="workspace-detail-title">{workspace.name}</h1>
          <p className="workspace-detail-desc">
            {workspace.description ||
              "This workspace does not have a description yet. Add one so the team understands what kind of work belongs here."}
          </p>
          <div className="workspace-meta-row">
            <span className="workspace-meta-pill">Slug: {workspace.slug}</span>
            <span className="workspace-meta-pill">Created {timeAgo(workspace.createdAt)}</span>
            <span className="workspace-meta-pill">Updated {timeAgo(workspace.updatedAt)}</span>
            <span className="workspace-meta-pill">{agents.length} agent definitions</span>
          </div>
          <p className="workspace-overview-description">{workspaceGuidance.description}</p>
          <div className="workspace-detail-actions">
            {workspaceGuidance.actions.map((action) => (
              <Link
                key={`${action.href}:${action.label}`}
                href={action.href}
                className={`btn ${action.variant === "primary" ? "btn-primary" : "btn-secondary"}`}
              >
                {action.label}
              </Link>
            ))}
            <Link href={`/workspaces/${id}/agents`} className="btn btn-secondary">
              Agents
            </Link>
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button type="button" className="btn btn-danger" onClick={() => setConfirmDelete(true)}>
              Delete
            </button>
          </div>
        </div>

        <div className="workspace-overview-stats" aria-label="Workspace summary">
          <div className="workspace-stat-card stat-total">
            <div className="workspace-stat-value">{total}</div>
            <div className="workspace-stat-label">Projects</div>
          </div>
          <div className="workspace-stat-card stat-active">
            <div className="workspace-stat-value">{activeProjects}</div>
            <div className="workspace-stat-label">Active</div>
          </div>
          <div className="workspace-stat-card stat-completed">
            <div className="workspace-stat-value">{readyFeatures}</div>
            <div className="workspace-stat-label">Ready Features</div>
          </div>
          <div className="workspace-stat-card stat-failed">
            <div className="workspace-stat-value">{failedProjects}</div>
            <div className="workspace-stat-label">Failed</div>
          </div>
        </div>
      </section>

      {actionError && (
        <div className="error-banner" role="alert">
          <strong>Workspace action failed</strong>
          <div>{actionError.message}</div>
          {actionError.details && <pre className="error-banner-details">{actionError.details}</pre>}
        </div>
      )}

      {editing && (
        <div className="workspace-create-card">
          <h3>Edit Workspace</h3>
          <p className="workspace-form-note">
            Name this workspace for a product area, team, or initiative. The description should make
            it obvious what kind of features and projects belong here.
          </p>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="edit-name">
                Name
              </label>
              <input
                id="edit-name"
                className="input"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, name: [] }));
                }}
              />
              <p className="field-hint">Example: Growth Platform, Internal Tools, Mobile App.</p>
              {getFieldError(fieldErrors, "name") && (
                <p className="field-error">{getFieldError(fieldErrors, "name")}</p>
              )}
            </div>
            <div>
              <label className="label" htmlFor="edit-desc">
                Description
              </label>
              <textarea
                id="edit-desc"
                className="textarea"
                value={editDesc}
                onChange={(e) => {
                  setEditDesc(e.target.value);
                  setFieldErrors((prev) => ({ ...prev, description: [] }));
                }}
                rows={3}
                placeholder="What this workspace owns, how teams use it, and what kinds of work should be routed here."
              />
              <p className="field-hint">
                Optional, but useful. This text becomes the operating context for the workspace.
              </p>
              {getFieldError(fieldErrors, "description") && (
                <p className="field-error">{getFieldError(fieldErrors, "description")}</p>
              )}
            </div>
            <div className="flex gap-2" style={{ marginTop: "0.25rem" }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void handleSave()}
                disabled={saving || !editName.trim()}
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditing(false);
                  setActionError(null);
                  setFieldErrors({});
                  setEditName(workspace.name);
                  setEditDesc(workspace.description || "");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="workspace-context-grid">
        <div className="card workspace-context-card">
          <p className="workspace-card-eyebrow">Pipeline snapshot</p>
          <div className="workspace-kpi-grid">
            <div>
              <strong>{features.length}</strong>
              <span>Total features</span>
            </div>
            <div>
              <strong>{readyFeatures}</strong>
              <span>Ready to launch</span>
            </div>
            <div>
              <strong>{inProgressFeatures}</strong>
              <span>Features in progress</span>
            </div>
            <div>
              <strong>{linkedFeatures}</strong>
              <span>Linked to project</span>
            </div>
          </div>
        </div>

        <div className="card workspace-context-card">
          <p className="workspace-card-eyebrow">Operational notes</p>
          <ul className="workspace-context-list">
            <li>
              <span>Projects in queue</span>
              <strong>{projects.length}</strong>
            </li>
            <li>
              <span>Completed runs</span>
              <strong>{completedProjects}</strong>
            </li>
            <li>
              <span>Agent definitions</span>
              <strong>{agents.length}</strong>
            </li>
            <li>
              <span>Best next surface</span>
              <strong>{readyFeatures > 0 ? "Feature Board" : "Project Brief"}</strong>
            </li>
          </ul>
        </div>
      </section>

      <div className="ws-section-header">
        <div>
          <h3 className="ws-section-title">Projects</h3>
          <p className="workspace-section-subtitle">
            Review active runs here. Use the board when you need to prioritize or launch from saved
            features.
          </p>
        </div>
        <div className="workspace-section-actions">
          <Link href={buildBoardHref(id)} className="btn btn-secondary">
            Feature Board
          </Link>
          <Link href="/projects/new" className="btn btn-primary">
            New Project
          </Link>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="workspace-empty">
          <div className="workspace-empty-icon" aria-hidden="true">
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
              <title>Project checklist icon</title>
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className="workspace-empty-title">No projects in this workspace yet</h3>
          <p className="workspace-empty-desc">
            {features.length > 0
              ? `You already have ${features.length} captured feature${features.length === 1 ? "" : "s"}. Launch from the board if you want to start from prioritized backlog work.`
              : "Create a project directly or capture features on the board so the workspace has a queue to execute from."}
          </p>
          <div className="home-empty-actions">
            <Link href={buildBoardHref(id)} className="btn btn-secondary">
              Open Feature Board
            </Link>
            <Link href="/projects/new" className="btn btn-primary">
              New Project
            </Link>
          </div>
        </div>
      ) : (
        <div className="workspace-project-list">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="workspace-project-item"
            >
              <div className="workspace-project-info">
                <div className="workspace-project-name">{project.name}</div>
                <p className="workspace-project-goal">{project.goal}</p>
              </div>
              <div className="workspace-project-status">
                <StatusBadge status={project.status} />
              </div>
            </Link>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
        title="Delete Workspace"
        message="This deletes the workspace and its projects. Use this only if the workspace is no longer needed."
        confirmText={deleting ? "Deleting..." : "Delete"}
        variant="danger"
      />
    </div>
  );
}
