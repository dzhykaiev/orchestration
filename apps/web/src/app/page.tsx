"use client";

import type { OrchestratorEvent } from "@orchestration/shared";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "../components/ActivityFeed";
import { SkeletonCard } from "../components/ui/SkeletonCard";
import { StatusBadge } from "../components/ui/StatusBadge";
import { usePolling } from "../hooks/usePolling";
import { useSSE } from "../hooks/useSSE";
import { type ActivityItem, eventToActivity } from "../lib/activity";
import { type Project, type Workspace, api } from "../lib/api";
import { getProviderStyle, timeAgo } from "../lib/utils";
import {
  buildBoardHref,
  readStoredBoardWorkspaceId,
  resolveWorkspaceSelection,
} from "../lib/workspaceNavigation";

const PROJECT_PAGE_LIMIT = 100;

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
  codex: "Codex",
  opencode: "OpenCode",
};

const ALL_STATUSES = [
  "draft",
  "planning",
  "in_progress",
  "completed",
  "failed",
  "archived",
] as const;

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
type GuidanceAction =
  | { kind: "link"; href: string; label: string; variant: "primary" | "secondary" }
  | { kind: "filter"; status: string; label: string; variant: "primary" | "secondary" };

function getHomeGuidance({
  boardHref,
  workspaceCount,
  projectCount,
  activeCount,
  draftCount,
  failedCount,
}: {
  boardHref: string;
  workspaceCount: number;
  projectCount: number;
  activeCount: number;
  draftCount: number;
  failedCount: number;
}): {
  eyebrow: string;
  title: string;
  description: string;
  actions: GuidanceAction[];
} {
  if (workspaceCount === 0) {
    return {
      eyebrow: "Set up the system",
      title: "Create the first workspace",
      description:
        "Workspaces hold your features, projects, and agent configuration. Nothing else is useful until this exists.",
      actions: [
        {
          kind: "link",
          href: "/workspaces/new",
          label: "Create Workspace",
          variant: "primary" as const,
        },
      ],
    };
  }

  if (projectCount === 0) {
    return {
      eyebrow: "No execution yet",
      title: "Turn ideas into the first project",
      description:
        "Add features on the board if you want prioritization, or create a project directly if the goal is already clear.",
      actions: [
        { kind: "link", href: boardHref, label: "Open Feature Board", variant: "primary" as const },
        {
          kind: "link",
          href: "/projects/new",
          label: "Create Project",
          variant: "secondary" as const,
        },
      ],
    };
  }

  if (failedCount > 0) {
    return {
      eyebrow: "Attention needed",
      title: "Resolve failed execution before starting more work",
      description:
        "Failed projects usually mean the brief, repo context, or downstream tasks need correction. Review the failures first.",
      actions: [
        {
          kind: "filter",
          status: "failed",
          label: "Show Failed Projects",
          variant: "primary" as const,
        },
        {
          kind: "link",
          href: boardHref,
          label: "Check Feature Board",
          variant: "secondary" as const,
        },
      ],
    };
  }

  if (activeCount > 0) {
    return {
      eyebrow: "Execution in motion",
      title: "Monitor active projects and unblock agents quickly",
      description:
        "Use the project detail pages to inspect workstreams, failed tasks, escalations, and generated artifacts while execution is live.",
      actions: [
        { kind: "link", href: boardHref, label: "Open Feature Board", variant: "primary" as const },
        {
          kind: "link",
          href: "/projects/new",
          label: "Create Another Project",
          variant: "secondary" as const,
        },
      ],
    };
  }

  if (draftCount > 0) {
    return {
      eyebrow: "Drafts waiting",
      title: "Start planning on saved project briefs",
      description:
        "Draft projects are defined but not executing. Review provider and repo settings, then start planning to generate architecture and workstreams.",
      actions: [
        {
          kind: "link",
          href: "/projects/new",
          label: "Create Project",
          variant: "secondary" as const,
        },
        {
          kind: "link",
          href: boardHref,
          label: "Prioritize Features",
          variant: "primary" as const,
        },
      ],
    };
  }

  return {
    eyebrow: "Pipeline healthy",
    title: "Pick the next outcome to ship",
    description:
      "Your current queue is stable. Use the board to prioritize upcoming work or create a new project brief for the next execution cycle.",
    actions: [
      {
        kind: "link",
        href: boardHref,
        label: "Prioritize Features",
        variant: "primary" as const,
      },
      {
        kind: "link",
        href: "/projects/new",
        label: "Create Project",
        variant: "secondary" as const,
      },
    ],
  };
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activityEvents, setActivityEvents] = useState<ActivityItem[]>([]);
  const [storedBoardWorkspaceId, setStoredBoardWorkspaceId] = useState("");

  const fetchProjects = useCallback(async () => {
    try {
      const [data, wsData] = await Promise.all([
        api.projects.list(PROJECT_PAGE_LIMIT, 0, showArchived),
        api.workspaces.list(100, 0),
      ]);
      setProjects(data.data);
      setTotal(data.total);
      setWorkspaces(wsData.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, [showArchived]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setStoredBoardWorkspaceId(readStoredBoardWorkspaceId(window.localStorage));
  }, []);

  const hasActive = projects.some((p) => ["planning", "in_progress"].includes(p.status));
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
        (p) => p.name.toLowerCase().includes(q) || p.goal.toLowerCase().includes(q),
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

  const archivedCount = statusCounts.archived ?? 0;
  const activeCount = projects.filter((p) => ["planning", "in_progress"].includes(p.status)).length;
  const draftCount = projects.filter((p) => p.status === "draft").length;
  const failedCount = projects.filter((p) => p.status === "failed").length;
  const completedCount = projects.filter((p) => p.status === "completed").length;
  const boardWorkspaceId = resolveWorkspaceSelection({
    requestedWorkspaceId: "",
    storedWorkspaceId: storedBoardWorkspaceId,
    availableWorkspaceIds: workspaces.map((workspace) => workspace.id),
  });
  const boardHref = buildBoardHref(boardWorkspaceId);
  const homeGuidance = getHomeGuidance({
    boardHref,
    workspaceCount: workspaces.length,
    projectCount: projects.length,
    activeCount,
    draftCount,
    failedCount,
  });
  const isSubset = total > projects.length;

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
        <button type="button" className="btn btn-secondary" onClick={fetchProjects}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="home-layout">
      <div className="home-projects">
        <section className="home-overview card">
          <div className="home-overview-copy">
            <p className="home-overview-eyebrow">{homeGuidance.eyebrow}</p>
            <h1 className="home-overview-title">{homeGuidance.title}</h1>
            <p className="home-overview-description">{homeGuidance.description}</p>
            <div className="home-overview-actions">
              {homeGuidance.actions.map((action) =>
                action.kind === "link" ? (
                  <Link
                    key={`${action.kind}:${action.href}:${action.label}`}
                    href={action.href}
                    className={`btn ${action.variant === "primary" ? "btn-primary" : "btn-secondary"}`}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    key={`${action.kind}:${action.status}:${action.label}`}
                    type="button"
                    className={`btn ${action.variant === "primary" ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => setStatusFilter(action.status)}
                  >
                    {action.label}
                  </button>
                ),
              )}
            </div>
          </div>

          <div className="home-overview-stats" aria-label="Workspace and project summary">
            <div className="home-stat-card">
              <span className="home-stat-value">{workspaces.length}</span>
              <span className="home-stat-label">Workspaces</span>
            </div>
            <div className="home-stat-card">
              <span className="home-stat-value">{activeCount}</span>
              <span className="home-stat-label">Active Projects</span>
            </div>
            <div className="home-stat-card">
              <span className="home-stat-value">{draftCount}</span>
              <span className="home-stat-label">Drafts</span>
            </div>
            <div className="home-stat-card">
              <span className="home-stat-value">{completedCount}</span>
              <span className="home-stat-label">Completed</span>
            </div>
          </div>
        </section>

        <div className="home-section-head">
          <div>
            <h2 style={{ margin: 0 }}>Projects</h2>
            <p className="home-section-subtitle">
              {isSubset
                ? `Showing ${projects.length} recent projects out of ${total}.`
                : `${total} project${total === 1 ? "" : "s"} in the current view.`}
            </p>
          </div>
          {archivedCount > 0 && (
            <label className="home-archive-toggle">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setShowArchived(e.target.checked)
                }
              />
              Show archived ({archivedCount})
            </label>
          )}
        </div>

        <div className="filter-toolbar mb-2">
          <input
            className="input search-input"
            type="search"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            aria-label="Search projects"
          />
          <select
            className="sort-select"
            value={sortBy}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setSortBy(e.target.value as SortOption)
            }
            aria-label="Sort projects"
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
              type="button"
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
          <div className="card home-empty-state">
            {projects.length === 0 ? (
              workspaces.length === 0 ? (
                <>
                  <p className="home-empty-title">No workspaces yet</p>
                  <p className="text-muted mb-2">
                    Create a workspace first. After that you can add features on the board or open a
                    project directly.
                  </p>
                  <Link href="/workspaces/new" className="btn btn-primary">
                    Create Workspace
                  </Link>
                </>
              ) : (
                <>
                  <p className="home-empty-title">No projects yet</p>
                  <p className="text-muted mb-2">
                    Start from the feature board if you want prioritization, or create a project now
                    if the brief is ready.
                  </p>
                  <div className="home-empty-actions">
                    <Link href={boardHref} className="btn btn-secondary">
                      Feature Board
                    </Link>
                    <Link href="/projects/new" className="btn btn-primary">
                      Create Project
                    </Link>
                  </div>
                </>
              )
            ) : (
              <>
                <p className="home-empty-title">No projects match the current filters</p>
                <p className="text-muted mb-2">
                  Clear the search or status filters to return to the full project queue.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : (
          filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                opacity: project.status === "archived" ? 0.6 : 1,
              }}
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
                  {project.updatedAt !== project.createdAt &&
                    ` · Updated ${timeAgo(project.updatedAt)}`}
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
