"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { FeatureModal } from "../../components/board/FeatureModal";
import { KanbanColumn } from "../../components/board/KanbanColumn";
import { useToastContext } from "../../components/ui/ToastProvider";
import { api, getErrorDetails, getErrorMessage } from "../../lib/api";
import type { AgentDefinition, Feature, Project, Workspace } from "../../lib/api";
import {
  readStoredBoardWorkspaceId,
  resolveWorkspaceSelection,
  writeStoredBoardWorkspaceId,
} from "../../lib/workspaceNavigation";
import { buildFeatureSearchText } from "./board-utils";

const STATUSES = ["backlog", "todo", "in_progress", "done", "rejected"] as const;

const STATUS_LABELS: Record<Feature["status"], string> = {
  backlog: "Backlog",
  todo: "Ready",
  in_progress: "In progress",
  done: "Done",
  rejected: "Rejected",
};

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [projectsById, setProjectsById] = useState<
    Record<string, Pick<Project, "id" | "name" | "status">>
  >({});
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<Feature["status"] | "all">("all");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const toast = useToastContext();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Load workspaces first, then features for selected workspace
  const fetchWorkspaces = useCallback(async () => {
    try {
      const workspacesData = await api.companies.list(100, 0);
      setWorkspaces(workspacesData.data);
      return workspacesData.data;
    } catch (err) {
      toastRef.current.error(err instanceof Error ? err.message : "Failed to load companies");
      return [];
    }
  }, []);

  const fetchBoardData = useCallback(async (workspaceId: string) => {
    if (!workspaceId) {
      setFeatures([]);
      setProjectsById({});
      setAgents([]);
      setLoading(false);
      return;
    }
    try {
      const [featuresData, projectsData, agentsData] = await Promise.all([
        api.companies.tickets(workspaceId),
        api.companies.projects(workspaceId, 100, 0, true),
        api.companies.agents(workspaceId),
      ]);
      setFeatures(featuresData.tickets);
      setAgents(agentsData.agents);
      setProjectsById(
        Object.fromEntries(
          projectsData.data.map((project) => [
            project.id,
            { id: project.id, name: project.name, status: project.status },
          ]),
        ),
      );
    } catch (err) {
      toastRef.current.error({
        title: "Couldn't load the board",
        message: getErrorMessage(err, "Failed to load features"),
        details: getErrorDetails(err),
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const syncWorkspaceContext = useCallback(
    (workspaceId: string) => {
      const currentWorkspaceId = searchParams.get("workspaceId") || "";
      if (currentWorkspaceId === workspaceId) {
        return;
      }
      const params = new URLSearchParams(searchParams.toString());
      if (workspaceId) {
        params.set("workspaceId", workspaceId);
      } else {
        params.delete("workspaceId");
      }
      const nextQuery = params.toString();
      router.replace(nextQuery ? `/board?${nextQuery}` : "/board", { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    fetchWorkspaces().then((ws) => {
      if (ws.length === 0) {
        setLoading(false);
        return;
      }
      const requestedWorkspaceId = searchParams.get("workspaceId") || "";
      const stored = readStoredBoardWorkspaceId(
        typeof window === "undefined" ? null : window.localStorage,
      );
      const initial = resolveWorkspaceSelection({
        requestedWorkspaceId,
        storedWorkspaceId: stored,
        availableWorkspaceIds: ws.map((workspace) => workspace.id),
      });
      setSelectedWorkspaceId(initial);
      const queryType = searchParams.get("type");
      const queryProjectId = searchParams.get("projectId");
      const querySearch = searchParams.get("q");
      const queryStatus = searchParams.get("status");
      if (queryType === "bug") {
        setTypeFilter("bug");
      }
      if (queryProjectId) {
        setProjectFilter(queryProjectId);
      }
      if (querySearch) {
        setSearchQuery(querySearch);
      }
      if (queryStatus && STATUSES.includes(queryStatus as Feature["status"])) {
        setStatusFilter(queryStatus as Feature["status"]);
      }
      writeStoredBoardWorkspaceId(
        typeof window === "undefined" ? null : window.localStorage,
        initial,
      );
      syncWorkspaceContext(initial);
      fetchBoardData(initial);
    });
  }, [fetchWorkspaces, fetchBoardData, searchParams, syncWorkspaceContext]);

  function handleWorkspaceChange(wsId: string) {
    setSelectedWorkspaceId(wsId);
    writeStoredBoardWorkspaceId(typeof window === "undefined" ? null : window.localStorage, wsId);
    syncWorkspaceContext(wsId);
    setLoading(true);
    fetchBoardData(wsId);
  }

  function clearFilters() {
    setSearchQuery("");
    setTypeFilter("all");
    setProjectFilter("all");
    setAssigneeFilter("all");
    setStatusFilter("all");
  }

  function handleStatusFilterClick(nextStatus: Feature["status"] | "all") {
    setStatusFilter(nextStatus);
  }

  const refreshFeatures = useCallback(async () => {
    if (selectedWorkspaceId) {
      await fetchBoardData(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, fetchBoardData]);

  const agentNameById = useMemo(
    () => Object.fromEntries(agents.map((agent) => [agent.id, agent.name])),
    [agents],
  );

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    typeFilter !== "all" ||
    projectFilter !== "all" ||
    assigneeFilter !== "all" ||
    statusFilter !== "all";

  const filteredFeatures = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return features.filter((feature) => {
      if (statusFilter !== "all" && feature.status !== statusFilter) return false;
      if (typeFilter !== "all" && feature.type !== typeFilter) return false;
      if (projectFilter !== "all" && feature.sourceProjectId !== projectFilter) return false;
      if (assigneeFilter === "orchestrator" && feature.assigneeMode !== "orchestrator") return false;
      if (assigneeFilter.startsWith("agent:")) {
        const agentId = assigneeFilter.replace("agent:", "");
        if (feature.assigneeAgentDefinitionId !== agentId) return false;
      }

      if (normalizedSearch) {
        const sourceProjectName = feature.sourceProjectId
          ? projectsById[feature.sourceProjectId]?.name
          : undefined;
        const linkedProjectName = feature.orchestrationProjectId
          ? projectsById[feature.orchestrationProjectId]?.name
          : undefined;
        const assigneeName =
          feature.assigneeMode === "agent"
            ? agentNameById[feature.assigneeAgentDefinitionId ?? ""] || "Assigned agent"
            : "Main orchestrator";
        const haystack = buildFeatureSearchText(
          feature,
          assigneeName,
          sourceProjectName,
          linkedProjectName,
        );
        if (!haystack.includes(normalizedSearch)) return false;
      }

      return true;
    });
  }, [
    agentNameById,
    assigneeFilter,
    features,
    projectFilter,
    projectsById,
    searchQuery,
    statusFilter,
    typeFilter,
  ]);

  const visibleStatuses = useMemo(
    () => (statusFilter === "all" ? [...STATUSES] : [statusFilter]),
    [statusFilter],
  );

  const boardMinWidth = `${visibleStatuses.length * 260 + Math.max(visibleStatuses.length - 1, 0) * 16}px`;

  const featuresByStatus = useMemo(
    () =>
      visibleStatuses.reduce(
        (acc, currentStatus) => {
          acc[currentStatus] = filteredFeatures.filter((feature) => feature.status === currentStatus);
          return acc;
        },
        {} as Record<Feature["status"], Feature[]>,
      ),
    [filteredFeatures, visibleStatuses],
  );

  const statusCounts = useMemo(
    () =>
      STATUSES.reduce(
        (acc, currentStatus) => {
          acc[currentStatus] = features.filter((feature) => feature.status === currentStatus).length;
          return acc;
        },
        {} as Record<Feature["status"], number>,
      ),
    [features],
  );

  async function handleDrop(featureId: string, newStatus: Feature["status"]) {
    const feature = features.find((f) => f.id === featureId);
    if (!feature || feature.status === newStatus) return;

    // Optimistic update
    setFeatures((prev) => prev.map((f) => (f.id === featureId ? { ...f, status: newStatus } : f)));

    try {
      await api.tickets.update(featureId, { status: newStatus });
    } catch (err) {
      // Revert on error
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, status: feature.status } : f)),
      );
      toast.error({
        title: "Couldn't move feature",
        message: getErrorMessage(err, "Failed to update status"),
        details: getErrorDetails(err),
      });
    }
  }

  function handleStatusChange(feature: Feature, newStatus: Feature["status"]) {
    void handleDrop(feature.id, newStatus);
  }

  function handleEdit(feature: Feature) {
    setEditingFeature(feature);
    setModalOpen(true);
  }

  function handleNewFeature() {
    setEditingFeature(null);
    setModalOpen(true);
  }

  async function handleSave(data: {
    workspaceId?: string;
    title: string;
    description?: string;
    type: string;
    priority: number;
    status?: string;
    sourceProjectId?: string | null;
    assigneeMode?: "orchestrator" | "agent";
    assigneeAgentDefinitionId?: string | null;
  }) {
    try {
      if (editingFeature) {
        const { workspaceId: _, ...updateData } = data;
        await api.tickets.update(editingFeature.id, updateData);
        toast.success("Feature updated");
      } else {
        if (!data.workspaceId) {
          toast.error("Workspace is required");
          return;
        }
        await api.tickets.create({
          workspaceId: data.workspaceId,
          title: data.title,
          description: data.description,
          type: data.type,
          priority: data.priority,
          sourceProjectId: data.sourceProjectId ?? undefined,
          assigneeMode: data.assigneeMode,
          assigneeAgentDefinitionId: data.assigneeAgentDefinitionId,
        });
        toast.success("Feature created");
      }
      setModalOpen(false);
      setEditingFeature(null);
      await refreshFeatures();
    } catch (err) {
      toast.error({
        title: editingFeature ? "Couldn't update feature" : "Couldn't create feature",
        message: getErrorMessage(err, "Failed to save feature"),
        details: getErrorDetails(err),
      });
      throw err;
    }
  }

  async function handleKickoff(feature: Feature) {
    if (
      !confirm(
        `Start ticket execution for "${feature.title}"? This will create a linked execution project.`,
      )
    ) {
      return;
    }

    try {
      const { project } = await api.tickets.kickoff(feature.id);
      toast.success({
        title: "Kickoff started",
        message: `Project created: ${project.name}`,
        details: "The linked project is now ready for planning.",
      });
      await refreshFeatures();
    } catch (err) {
      toast.error({
        title: "Couldn't kick off feature",
        message: getErrorMessage(err, "Failed to kickoff"),
        details: getErrorDetails(err),
      });
    }
  }

  async function handleDelete(feature: Feature) {
    if (!confirm(`Delete "${feature.title}"?`)) return;

    try {
      await api.tickets.delete(feature.id);
      setFeatures((prev) => prev.filter((f) => f.id !== feature.id));
      toast.success("Feature deleted");
    } catch (err) {
      toast.error({
        title: "Couldn't delete feature",
        message: getErrorMessage(err, "Failed to delete"),
        details: getErrorDetails(err),
      });
    }
  }

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);
  const issueMode = typeFilter === "bug";
  const visibleTicketCount = filteredFeatures.length;
  const readyToKickoff = filteredFeatures.filter(
    (feature) => feature.status === "todo" && !feature.orchestrationProjectId,
  ).length;
  const linkedProjectCount = filteredFeatures.filter(
    (feature) => feature.orchestrationProjectId,
  ).length;
  const activeProjectCount = Object.values(projectsById).filter((project) =>
    ["planning", "in_progress"].includes(project.status),
  ).length;
  const boardTip = hasActiveFilters
    ? `Showing ${visibleTicketCount} ticket${visibleTicketCount === 1 ? "" : "s"} in ${statusFilter === "all" ? "all statuses" : STATUS_LABELS[statusFilter]}.`
    : issueMode
      ? "Issue mode is active. Track bugs, assign owners, and move items toward resolution."
      : readyToKickoff > 0
        ? `${readyToKickoff} ticket${readyToKickoff > 1 ? "s are" : " is"} ready to kick off.`
        : activeProjectCount > 0
          ? `${activeProjectCount} linked project${activeProjectCount > 1 ? "s are" : " is"} currently running.`
          : "Move backlog items into Ready when they are clear enough for orchestration.";

  if (loading) {
    return (
      <div className="kanban-page">
        <Breadcrumbs items={[{ label: "Board" }]} />
        <div className="ws-page-header">
          <div className="ws-page-header-row">
            <div>
              <h2 className="ws-page-title">Ticket Board</h2>
              <p className="ws-page-subtitle">Loading...</p>
            </div>
          </div>
        </div>
        <div className="skeleton" style={{ height: 300 }} />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="kanban-page">
        <Breadcrumbs items={[{ label: "Board" }]} />
        <div className="ws-page-header">
          <div className="ws-page-header-row">
            <div>
              <h2 className="ws-page-title">Ticket Board</h2>
              <p className="ws-page-subtitle">Manage tickets across your company</p>
            </div>
          </div>
        </div>
        <div className="workspace-empty">
          <div className="workspace-empty-icon" aria-hidden="true">
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
          </div>
          <h3 className="workspace-empty-title">No companies found</h3>
          <p className="workspace-empty-desc">
            Create a company first to manage tickets on a Kanban board.
          </p>
          <Link href="/workspaces/new" className="btn btn-primary">
            Create Company
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-page">
      <Breadcrumbs items={[{ label: "Board" }]} />

      <div className="ws-page-header">
        <div className="ws-page-header-row">
          <div>
            <h2 className="ws-page-title">Ticket Board</h2>
            <p className="ws-page-subtitle">
              {selectedWorkspace
                ? `Plan work inside ${selectedWorkspace.name}. Use filters to narrow the queue, then kick off tickets when they are ready.`
                : "Use the board to triage tickets, assign agents, and launch work."}
            </p>
          </div>
          <div className="board-header-actions">
            <select
              className="input board-workspace-select"
              value={selectedWorkspaceId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleWorkspaceChange(e.target.value)
              }
              aria-label="Select company"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-primary" onClick={handleNewFeature}>
              New Ticket
            </button>
          </div>
        </div>
      </div>

      <div className="board-mode-toggle">
        <button
          type="button"
          className={`btn ${!issueMode ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTypeFilter("all")}
        >
          All Tickets
        </button>
        <button
          type="button"
          className={`btn ${issueMode ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setTypeFilter("bug")}
        >
          Issues
        </button>
      </div>

      <div className="board-search-row">
        <input
          className="input board-search-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tickets, descriptions, projects, and assignees"
          aria-label="Search tickets"
        />
        <button
          type="button"
          className="btn btn-secondary"
          onClick={clearFilters}
          disabled={!hasActiveFilters}
        >
          Clear filters
        </button>
      </div>

      <div className="board-status-chips filter-chips" role="tablist" aria-label="Ticket status">
        <button
          type="button"
          className={`filter-chip ${statusFilter === "all" ? "active" : ""}`}
          onClick={() => handleStatusFilterClick("all")}
        >
          All <span className="chip-count">{features.length}</span>
        </button>
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={`filter-chip ${statusFilter === status ? "active" : ""}`}
            onClick={() => handleStatusFilterClick(status)}
          >
            {STATUS_LABELS[status]} <span className="chip-count">{statusCounts[status]}</span>
          </button>
        ))}
      </div>

      <div className="board-filters">
        <select
          className="input"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          aria-label="Filter by type"
        >
          <option value="all">All types</option>
          <option value="bug">Bug</option>
          <option value="feature">Ticket</option>
          <option value="improvement">Improvement</option>
          <option value="refactor">Refactor</option>
        </select>
        <select
          className="input"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          aria-label="Filter by source project"
        >
          <option value="all">All projects</option>
          {Object.values(projectsById).map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          className="input"
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          aria-label="Filter by assignee"
        >
          <option value="all">All assignees</option>
          <option value="orchestrator">Main orchestrator</option>
          {agents.map((agent) => (
            <option key={agent.id} value={`agent:${agent.id}`}>
              {agent.name} ({agent.role})
            </option>
          ))}
        </select>
      </div>

      <div className="board-overview">
        <div className="board-stats">
          <div className="board-stat">
            <span className="board-stat-value">{filteredFeatures.length}</span>
            <span className="board-stat-label">Visible tickets</span>
          </div>
          <div className="board-stat">
            <span className="board-stat-value">{readyToKickoff}</span>
            <span className="board-stat-label">Ready to kickoff</span>
          </div>
          <div className="board-stat">
            <span className="board-stat-value">{linkedProjectCount}</span>
            <span className="board-stat-label">Linked projects</span>
          </div>
          <div className="board-stat">
            <span className="board-stat-value">{activeProjectCount}</span>
            <span className="board-stat-label">Active now</span>
          </div>
        </div>
        <p className="board-tip">{boardTip}</p>
      </div>

      {filteredFeatures.length === 0 ? (
        <div className="workspace-empty">
          <div className="workspace-empty-icon" aria-hidden="true">
            <svg
              aria-hidden="true"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="8" y1="6" x2="21" y2="6" />
              <line x1="8" y1="12" x2="21" y2="12" />
              <line x1="8" y1="18" x2="21" y2="18" />
              <line x1="3" y1="6" x2="3.01" y2="6" />
              <line x1="3" y1="12" x2="3.01" y2="12" />
              <line x1="3" y1="18" x2="3.01" y2="18" />
            </svg>
          </div>
          <h3 className="workspace-empty-title">
            {features.length > 0 ? "No tickets match these filters" : "No tickets yet"}
          </h3>
          <p className="workspace-empty-desc">
            {features.length > 0
              ? "Try a different search, clear the filters, or switch to another status lane."
              : issueMode
                ? "No issues exist yet. Create one from this board or from a project page."
                : "Add your first ticket to the backlog and start organizing."}
          </p>
          <div className="workspace-empty-actions">
            {features.length > 0 && (
              <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                Clear filters
              </button>
            )}
            <button type="button" className="btn btn-primary" onClick={handleNewFeature}>
              New Ticket
            </button>
          </div>
        </div>
      ) : (
        <div className="board-shell">
          <div
            className="kanban-board"
            style={{
              "--kanban-column-count": String(visibleStatuses.length),
              minWidth: boardMinWidth,
            } as CSSProperties}
          >
            {visibleStatuses.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                features={featuresByStatus[status] || []}
                linkedProjects={projectsById}
                assigneeNamesById={agentNameById}
                onDrop={handleDrop}
                onEdit={handleEdit}
                onKickoff={handleKickoff}
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </div>
      )}

      <FeatureModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingFeature(null);
        }}
        onSave={handleSave}
        feature={editingFeature}
        workspaces={workspaces}
        agents={agents}
        projects={Object.values(projectsById)}
        defaultWorkspaceId={selectedWorkspaceId}
        defaultType={issueMode ? "bug" : "feature"}
      />
    </div>
  );
}
