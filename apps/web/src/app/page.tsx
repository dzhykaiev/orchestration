"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, type Project } from "../lib/api";
import { StatusBadge } from "../components/ui/StatusBadge";
import { usePolling } from "../hooks/usePolling";

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

  // Poll when any project is active
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
        <button className="btn btn-secondary" onClick={fetchProjects}>
          Retry
        </button>
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
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{project.name}</h3>
                <StatusBadge status={project.status} />
              </div>
              <p
                className="text-sm text-muted"
                style={{
                  margin: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {project.goal}
              </p>
            </div>
          </Link>
        ))
      )}
    </div>
  );
}
