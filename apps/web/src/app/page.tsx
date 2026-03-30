"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { api, type Project } from "../lib/api";
import { StatusBadge } from "../components/ui/StatusBadge";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { ActivityFeed } from "../components/ActivityFeed";
import { usePolling } from "../hooks/usePolling";
import { useSSE } from "../hooks/useSSE";
import { timeAgo, getProviderStyle } from "../lib/utils";
import { eventToActivity, type ActivityItem } from "../lib/activity";
import type { OrchestratorEvent } from "@orchestration/shared";

const STATUS_ICONS: Record<string, string> = {
  draft: "\u{1F4DD}",
  planning: "\u{2699}\u{FE0F}",
  in_progress: "\u{1F6A7}",
  completed: "\u{2705}",
  failed: "\u{274C}",
  archived: "\u{1F4E6}",
};

const PROVIDER_LABELS: Record<string, string> = {
  claude: "Claude",
  opencode: "OpenCode",
};

const ALL_STATUSES = ["draft", "planning", "in_progress", "completed", "failed", "archived"] as const;

const STATUS_LABELS: Record<string, string> = {
  all: "All",
  draft: "Draft",
  planning: "Planning",
  in_progress: "In Progress",
  completed: "Completed",
  failed: "Failed",
  archived: "Archived",
};

type SortOption = "newest" | "oldest" | "name_asc" | "name_desc";

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activityEvents, setActivityEvents] = useState<ActivityItem[]>([]);

  const fetchProjects = useCallback(async () => {
    try {
      const data = await api.projects.list(20, 0, showArchived);
      setProjects(data.projects);
      setTotal(data.total);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects, showArchived]);

  const hasActive = projects.some((p) =>
    ["planning", "in_progress"].includes(p.status),
  );
  usePolling(fetchProjects, 10000, hasActive);

  const { connected } = useSSE({
    onEvent: useCallback(
      (event: { type: string; payload: unknown }) => {
        fetchProjects();
        const item = eventToActivity(event as OrchestratorEvent);
        setActivityEvents((prev) => [item, ...prev].slice(0, 50));
      },
      [fetchProjects],
    ),
    enabled: true,
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: projects.length };
    for (const s of ALL_STATUSES) {
      counts[s] = projects.filter((p) => p.status === s).length;
    }
    return counts;
  }, [projects]);

  const filteredProjects = useMemo(() => {
    let result = projects;

    // Status filter
    if (statusFilter !== "all") {
      result = result.filter((p) => p.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.goal.toLowerCase().includes(q),
      );
    }

    // Sort
    result = [...result].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "name_asc":
          return a.name.localeCompare(b.name);
        case "name_desc":
          return b.name.localeCompare(a.name);
      }
    });

    return result;
  }, [projects, statusFilter, searchQuery, sortBy]);

  const archivedCount = statusCounts["archived"] ?? 0;

  if (loading) {
    return (
      <div>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <p style={{ color: "var(--color-danger)" }}>Error: {error}</p>
        <button className="btn btn-secondary" onClick={fetchProjects}>Retry</button>
      </div>
    );
  }

  return (
    <div className="home-layout">
      <div className="home-projects">
        <div className="flex justify-between items-center mb-2">
          <h2 style={{ margin: 0 }}>Projects ({total})</h2>
          {archivedCount > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: "0.85rem" }}>
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setShowArchived(e.target.checked)}
              />
              Show archived ({archivedCount})
            </label>
          )}
        </div>

        <div className="filter-toolbar mb-2">
          <input
            className="input search-input"
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSortBy(e.target.value as SortOption)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
          </select>
        </div>

        <div className="filter-chips mb-2">
          {["all", ...ALL_STATUSES].map((status) => (
            <button
              key={status}
              className={`filter-chip ${statusFilter === status ? "active" : ""}`}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_LABELS[status]}
              <span className="chip-count">({statusCounts[status] ?? 0})</span>
            </button>
          ))}
        </div>

        {filteredProjects.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
            <p className="text-muted mb-2">No projects found.</p>
            <Link href="/projects/new" className="btn btn-primary">
              Create your first project
            </Link>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              style={{ textDecoration: "none", color: "inherit", opacity: project.status === "archived" ? 0.6 : 1 }}
            >
              <div className="card" style={{ cursor: "pointer" }}>
                <div className="flex justify-between items-center mb-1">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{STATUS_ICONS[project.status] ?? ""}</span>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{project.name}</h3>
                    {project.provider && (
                      <span
                        className="text-sm"
                        style={{
                          ...getProviderStyle(project.provider),
                          padding: "1px 8px",
                          borderRadius: 10,
                          fontSize: "0.7rem",
                          fontWeight: 600,
                        }}
                      >
                        {PROVIDER_LABELS[project.provider] ?? project.provider}
                      </span>
                    )}
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
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <div className="home-sidebar">
        <ActivityFeed events={activityEvents} connected={connected} />
      </div>
    </div>
  );
}
