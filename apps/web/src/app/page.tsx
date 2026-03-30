"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, type Project } from "../lib/api";
import { StatusBadge } from "../components/ui/StatusBadge";
import { usePolling } from "../hooks/usePolling";

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  return `${days}d ago`;
}

const STATUS_ICONS: Record<string, string> = {
  draft: "\u{1F4DD}",
  planning: "\u{2699}\u{FE0F}",
  in_progress: "\u{1F6A7}",
  completed: "\u{2705}",
  failed: "\u{274C}",
};

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.projects.list();
      setProjects(data.projects);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const hasActive = projects.some((p) =>
    ["planning", "in_progress"].includes(p.status),
  );
  usePolling(fetchProjects, 3000, hasActive);

  if (loading) {
    return <p className="text-muted">Loading projects...</p>;
  }

  if (error) {
    return (
      <div>
        <p style={{ color: "#721c24" }}>Error: {error}</p>
        <button className="btn btn-secondary" onClick={fetchProjects}>Retry</button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h2 style={{ margin: 0 }}>Projects ({total})</h2>
      </div>

      {projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="text-muted mb-2">No projects yet.</p>
          <Link href="/projects/new" className="btn btn-primary">
            Create your first project
          </Link>
        </div>
      ) : (
        projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="card" style={{ cursor: "pointer" }}>
              <div className="flex justify-between items-center mb-1">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{STATUS_ICONS[project.status] ?? ""}</span>
                  <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{project.name}</h3>
                </div>
                <StatusBadge status={project.status} />
              </div>
              <p
                className="text-sm text-muted"
                style={{
                  margin: "0 0 8px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {project.goal}
              </p>
              <div className="text-sm text-muted" style={{ fontSize: "0.75rem" }}>
                Created {timeAgo(project.createdAt)}
                {project.updatedAt !== project.createdAt && ` · Updated ${timeAgo(project.updatedAt)}`}
                {project.architecture && " · Has architecture"}
              </div>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
