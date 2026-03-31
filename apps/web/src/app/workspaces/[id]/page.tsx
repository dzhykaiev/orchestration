"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
      <div className="flex items-center gap-2" style={{ marginBottom: "0.5rem" }}>
        <Link
          href="/workspaces"
          style={{
            color: "var(--color-text-secondary)",
            textDecoration: "none",
            fontSize: "0.85rem",
          }}
        >
          Workspaces
        </Link>
        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem" }}>/</span>
      </div>

      {editing ? (
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <div className="flex flex-col gap-3">
            <input
              className="input"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
            <textarea
              className="textarea"
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              rows={2}
              placeholder="Description"
            />
            <div className="flex gap-2">
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
        <div className="flex items-center justify-between" style={{ marginBottom: "1.5rem" }}>
          <div>
            <h2 style={{ margin: 0 }}>{workspace.name}</h2>
            {workspace.description && (
              <p
                style={{
                  margin: "0.25rem 0 0",
                  color: "var(--color-text-secondary)",
                  fontSize: "0.9rem",
                }}
              >
                {workspace.description}
              </p>
            )}
          </div>
          <div className="flex gap-2">
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
      )}

      <div
        className="grid gap-3"
        style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: "1.5rem" }}
      >
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{total}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Total</div>
        </div>
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{statusCounts.active}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Active</div>
        </div>
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{statusCounts.completed}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Completed</div>
        </div>
        <div className="card" style={{ padding: "1rem", textAlign: "center" }}>
          <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{statusCounts.failed}</div>
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>Failed</div>
        </div>
      </div>

      <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
        <h3 style={{ margin: 0 }}>Projects</h3>
        <Link href="/projects/new" className="btn btn-primary">
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
            No projects in this workspace yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="card"
              style={{
                padding: "1rem 1.25rem",
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div>
                <strong>{project.name}</strong>
                <p
                  style={{
                    margin: "0.25rem 0 0",
                    fontSize: "0.85rem",
                    color: "var(--color-text-secondary)",
                    maxWidth: 500,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {project.goal}
                </p>
              </div>
              <StatusBadge status={project.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
