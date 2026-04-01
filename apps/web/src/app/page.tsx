"use client";

import type { OrchestratorEvent } from "@orchestration/shared";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityFeed } from "../components/ActivityFeed";
import { NextActionPanel } from "../components/ui/NextActionPanel";
import { PageErrorState, PageLoadingState } from "../components/ui/PageStates";
import { StatusBadge } from "../components/ui/StatusBadge";
import { usePolling } from "../hooks/usePolling";
import { useSSE } from "../hooks/useSSE";
import { type ActivityItem, eventToActivity } from "../lib/activity";
import { type Company, type Project, api } from "../lib/api";
import { getProviderStyle, timeAgo } from "../lib/utils";
import {
  buildBoardHref,
  resolveCompanySelection,
} from "../lib/companyNavigation";

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
  companyCount,
  projectCount,
  activeCount,
  draftCount,
  failedCount,
}: {
  boardHref: string;
  companyCount: number;
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
  if (companyCount === 0) {
    return {
      eyebrow: "Set up the system",
      title: "Create the first company",
      description:
        "Companies hold your tickets, projects, and agent configuration. Nothing else is useful until this exists.",
      actions: [
        {
          kind: "link",
          href: "/companies/new",
          label: "Create Company",
          variant: "primary" as const,
        },
      ],
    };
  }

  if (projectCount === 0) {
    return {
      eyebrow: "No execution yet",
      title: "Capture the first ticket, then kick off execution",
      description:
        "Use the board as the default intake path so work is visible and prioritized before execution starts.",
      actions: [
        { kind: "link", href: boardHref, label: "Open Ticket Board", variant: "primary" as const },
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
          label: "Check Ticket Board",
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
        { kind: "link", href: boardHref, label: "Open Ticket Board", variant: "primary" as const },
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
          href: boardHref,
          label: "Prioritize Tickets",
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
        label: "Prioritize Tickets",
        variant: "primary" as const,
      },
    ],
  };
}

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
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
      const [data, companiesData] = await Promise.all([
        api.projects.list(PROJECT_PAGE_LIMIT, 0, showArchived),
        api.companies.list(100, 0),
      ]);
      setProjects(data.data);
      setTotal(data.total);
      setCompanies(companiesData.data);
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
  const boardCompanyId = resolveCompanySelection({
    requestedCompanyId: "",
    availableCompanyIds: companies.map((company) => company.id),
  });
  const boardHref = buildBoardHref(boardCompanyId);
  const homeGuidance = getHomeGuidance({
    boardHref,
    companyCount: companies.length,
    projectCount: projects.length,
    activeCount,
    draftCount,
    failedCount,
  });
  const isSubset = total > projects.length;

  if (loading) {
    return (
      <PageLoadingState
        title="Home"
        subtitle="Loading companies, projects, and activity context..."
        height={280}
      />
    );
  }

  if (error) {
    return (
      <PageErrorState
        title="Home failed to load"
        message={error}
        onRetry={() => void fetchProjects()}
      />
    );
  }

  return (
    <div className="home-layout">
      <div className="home-projects">
        <section className="home-overview card">
          <div className="home-overview-copy">
            <NextActionPanel
              eyebrow={homeGuidance.eyebrow}
              title={homeGuidance.title}
              description={homeGuidance.description}
              titleTag="h1"
              eyebrowClassName="home-overview-eyebrow"
              titleClassName="home-overview-title"
              descriptionClassName="home-overview-description"
              actionsClassName="home-overview-actions"
              actions={homeGuidance.actions.map((action) =>
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
            />
          </div>

          <div className="home-overview-stats" aria-label="Company and project summary">
            <div className="home-stat-card">
              <span className="home-stat-value">{companies.length}</span>
              <span className="home-stat-label">Companies</span>
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
              companies.length === 0 ? (
                <>
                  <p className="home-empty-title">No companies yet</p>
                  <p className="text-muted mb-2">
                    Create a company first. After that you can add tickets on the board or open a
                    project directly.
                  </p>
                  <Link href="/companies/new" className="btn btn-primary">
                    Create Company
                  </Link>
                </>
              ) : (
                <>
                  <p className="home-empty-title">No projects yet</p>
                  <p className="text-muted mb-2">
                    Start from the ticket board to capture and prioritize the first execution item.
                  </p>
                  <div className="home-empty-actions">
                    <Link href={boardHref} className="btn btn-primary">
                      Ticket Board
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
