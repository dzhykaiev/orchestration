"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Breadcrumbs } from "../../../components/Breadcrumbs";
import { StatusBadge } from "../../../components/ui/StatusBadge";
import { type Project, type Workspace, api } from "../../../lib/api";

export default function WorkspaceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([api.workspaces.get(id), api.workspaces.projects(id, 50)]).then(
      ([wsRes, projRes]) => {
        setWorkspace(wsRes.workspace);
        setProjects(projRes.data);
        setTotal(projRes.total);
        setEditName(wsRes.workspace.name);
        setEditDesc(wsRes.workspace.description || "");
        setLoading(false);
      },
    );
  }, [id]);

  const handleSave = async () => {
    if (!id) return;
    const { workspace: updated } = await api.workspaces.update(id, {
      name: editName,
      description: editDesc || undefined,
    });
    setWorkspace(updated);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!id || !confirm("Delete this workspace and all its projects?")) return;
    await api.workspaces.delete(id);
    router.push("/workspaces");
  };

  if (loading || !workspace) {
    return (
      <div>
        <div className="skeleton" style={{ height: 32, width: 200, marginBottom: "1rem" }} />
        <div className="skeleton" style={{ height: 200 }} />
      </div>
    );
  }

  const statusCounts = {
    draft: projects.filter((p) => p.status === "draft").length,
    active: projects.filter((p) => ["planning", "in_progress"].includes(p.status)).length,
    completed: projects.filter((p) => p.status === "completed").length,
    failed: projects.filter((p) => p.status === "failed").length,
  };

  return (
    <div>
      <Breadcrumbs
        items={[{ label: "Workspaces", href: "/workspaces" }, { label: workspace.name }]}
      />

      {editing ? (
        <div className="workspace-create-card">
          <h3>Edit Workspace</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label" htmlFor="edit-name">
                Name
              </label>
              <input
                id="edit-name"
                className="input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="edit-desc">
                Description
              </label>
              <textarea
                id="edit-desc"
                className="textarea"
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                rows={2}
                placeholder="Description"
              />
            </div>
            <div className="flex gap-2" style={{ marginTop: "0.25rem" }}>
              <button type="button" className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="workspace-detail-header">
          <div className="workspace-detail-top">
            <div className="workspace-detail-info">
              <h2 className="workspace-detail-title">{workspace.name}</h2>
              {workspace.description && (
                <p className="workspace-detail-desc">{workspace.description}</p>
              )}
            </div>
            <div className="workspace-detail-actions">
              <Link href={`/workspaces/${id}/agents`} className="btn btn-secondary">
                Agents
              </Link>
              <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}>
                Edit
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="workspace-stats">
        <div className="workspace-stat-card stat-total">
          <div className="workspace-stat-value">{total}</div>
          <div className="workspace-stat-label">Total</div>
        </div>
        <div className="workspace-stat-card stat-active">
          <div className="workspace-stat-value">{statusCounts.active}</div>
          <div className="workspace-stat-label">Active</div>
        </div>
        <div className="workspace-stat-card stat-completed">
          <div className="workspace-stat-value">{statusCounts.completed}</div>
          <div className="workspace-stat-label">Completed</div>
        </div>
        <div className="workspace-stat-card stat-failed">
          <div className="workspace-stat-value">{statusCounts.failed}</div>
          <div className="workspace-stat-label">Failed</div>
        </div>
      </div>

      <div className="ws-section-header">
        <h3 className="ws-section-title">Projects</h3>
        <Link href="/projects/new" className="btn btn-primary">
          New Project
        </Link>
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
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </div>
          <h3 className="workspace-empty-title">No projects yet</h3>
          <p className="workspace-empty-desc">
            Create your first project to start building with AI agents.
          </p>
          <Link href="/projects/new" className="btn btn-primary">
            New Project
          </Link>
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
    </div>
  );
}
