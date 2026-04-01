"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { FeatureModal } from "../../components/board/FeatureModal";
import { KanbanColumn } from "../../components/board/KanbanColumn";
import { ConfirmModal } from "../../components/ui/ConfirmModal";
import { PageEmptyState, PageErrorState, PageLoadingState } from "../../components/ui/PageStates";
import { useToastContext } from "../../components/ui/ToastProvider";
import { api, getErrorDetails, getErrorMessage } from "../../lib/api";
import type { AgentDefinition, Company, Project, Ticket } from "../../lib/api";
import { resolveCompanySelection } from "../../lib/companyNavigation";
import { buildFeatureSearchText } from "./board-utils";

const STATUSES = ["backlog", "todo", "in_progress", "done", "rejected"] as const;

const STATUS_LABELS: Record<Ticket["status"], string> = {
  backlog: "Backlog",
  todo: "Ready",
  in_progress: "In progress",
  done: "Done",
  rejected: "Rejected",
};

function getCompanyIdFromScopedPath(pathname: string): string {
  const match = pathname.match(/^\/companies\/([^/]+)\/board$/);
  return match?.[1] ?? "";
}

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [features, setFeatures] = useState<Ticket[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [projectsById, setProjectsById] = useState<
    Record<string, Pick<Project, "id" | "name" | "status">>
  >({});
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<Ticket["status"] | "all">("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string | undefined>();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Ticket | null>(null);
  const [confirmKickoffFeature, setConfirmKickoffFeature] = useState<Ticket | null>(null);
  const [confirmDeleteFeature, setConfirmDeleteFeature] = useState<Ticket | null>(null);
  const toast = useToastContext();
  const scopedCompanyId = useMemo(() => getCompanyIdFromScopedPath(pathname), [pathname]);
  const isCompanyScoped = scopedCompanyId.length > 0;

  const fetchCompanies = useCallback(async () => {
    try {
      const companiesData = await api.companies.list(100, 0);
      setCompanies(companiesData.data);
      setLoadError(null);
      setLoadErrorDetails(undefined);
      return companiesData.data;
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load companies"));
      setLoadErrorDetails(getErrorDetails(error));
      return [];
    }
  }, []);

  const fetchBoardData = useCallback(async (companyId: string) => {
    if (!companyId) {
      setFeatures([]);
      setProjectsById({});
      setAgents([]);
      setLoading(false);
      return;
    }

    try {
      const [featuresData, projectsData, agentsData] = await Promise.all([
        api.companies.tickets(companyId),
        api.companies.projects(companyId, 100, 0, true),
        api.companies.agents(companyId),
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
      setLoadError(null);
      setLoadErrorDetails(undefined);
    } catch (error) {
      setLoadError(getErrorMessage(error, "Failed to load board data"));
      setLoadErrorDetails(getErrorDetails(error));
    } finally {
      setLoading(false);
    }
  }, []);

  const syncCompanyContext = useCallback(
    (companyId: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("companyId");
      params.delete("workspaceId");
      const nextQuery = params.toString();
      const currentQuery = searchParams.toString();

      if (isCompanyScoped) {
        if (companyId === scopedCompanyId) return;
        const nextPath = companyId ? `/companies/${companyId}/board` : "/board";
        const nextHref = nextQuery ? `${nextPath}?${nextQuery}` : nextPath;
        if (nextHref === `${pathname}${currentQuery ? `?${currentQuery}` : ""}`) return;
        router.replace(nextHref, { scroll: false });
        return;
      }
      const nextPath = companyId ? `/companies/${companyId}/board` : "/board";
      const nextHref = nextQuery ? `${nextPath}?${nextQuery}` : nextPath;
      if (nextHref === `${pathname}${currentQuery ? `?${currentQuery}` : ""}`) return;
      router.replace(nextHref, { scroll: false });
    },
    [isCompanyScoped, pathname, router, scopedCompanyId, searchParams],
  );

  const initializeBoard = useCallback(async () => {
    setLoading(true);
    const availableCompanies = await fetchCompanies();
    if (availableCompanies.length === 0) {
      setSelectedCompanyId("");
      setLoading(false);
      return;
    }

    const requestedCompanyId =
      scopedCompanyId || searchParams.get("companyId") || searchParams.get("workspaceId") || "";
    const initialCompanyId = resolveCompanySelection({
      requestedCompanyId,
      availableCompanyIds: availableCompanies.map((company) => company.id),
    });

    setSelectedCompanyId(initialCompanyId);

    const queryType = searchParams.get("type");
    const queryProjectId = searchParams.get("projectId");
    const querySearch = searchParams.get("q");
    const queryStatus = searchParams.get("status");

    setTypeFilter(queryType === "bug" ? "bug" : "all");
    setProjectFilter(queryProjectId || "all");
    setSearchQuery(querySearch || "");
    setStatusFilter(
      queryStatus && STATUSES.includes(queryStatus as Ticket["status"])
        ? (queryStatus as Ticket["status"])
        : "all",
    );

    if (isCompanyScoped) {
      if (initialCompanyId && initialCompanyId !== scopedCompanyId) {
        const params = new URLSearchParams(searchParams.toString());
        params.delete("companyId");
        params.delete("workspaceId");
        const nextQuery = params.toString();
        const nextPath = `/companies/${initialCompanyId}/board`;
        router.replace(nextQuery ? `${nextPath}?${nextQuery}` : nextPath, { scroll: false });
      }
    } else {
      syncCompanyContext(initialCompanyId);
    }
    await fetchBoardData(initialCompanyId);
  }, [
    fetchBoardData,
    fetchCompanies,
    isCompanyScoped,
    router,
    scopedCompanyId,
    searchParams,
    syncCompanyContext,
  ]);

  useEffect(() => {
    void initializeBoard();
  }, [initializeBoard]);

  function handleCompanyChange(companyId: string) {
    setSelectedCompanyId(companyId);
    syncCompanyContext(companyId);
    setLoading(true);
    void fetchBoardData(companyId);
  }

  function clearFilters() {
    setSearchQuery("");
    setTypeFilter("all");
    setProjectFilter("all");
    setAssigneeFilter("all");
    setStatusFilter("all");
  }

  function handleStatusFilterClick(nextStatus: Ticket["status"] | "all") {
    setStatusFilter(nextStatus);
  }

  const refreshFeatures = useCallback(async () => {
    if (selectedCompanyId) {
      await fetchBoardData(selectedCompanyId);
    }
  }, [selectedCompanyId, fetchBoardData]);

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
        {} as Record<Ticket["status"], Ticket[]>,
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
        {} as Record<Ticket["status"], number>,
      ),
    [features],
  );

  async function handleDrop(featureId: string, newStatus: Ticket["status"]) {
    const feature = features.find((f) => f.id === featureId);
    if (!feature || feature.status === newStatus) return;

    setFeatures((prev) => prev.map((f) => (f.id === featureId ? { ...f, status: newStatus } : f)));

    try {
      await api.tickets.update(featureId, { status: newStatus });
    } catch (error) {
      setFeatures((prev) =>
        prev.map((f) => (f.id === featureId ? { ...f, status: feature.status } : f)),
      );
      toast.error({
        title: "Couldn't move ticket",
        message: getErrorMessage(error, "Failed to update status"),
        details: getErrorDetails(error),
      });
    }
  }

  function handleStatusChange(feature: Ticket, newStatus: Ticket["status"]) {
    void handleDrop(feature.id, newStatus);
  }

  function handleEdit(feature: Ticket) {
    setEditingFeature(feature);
    setModalOpen(true);
  }

  function handleNewFeature() {
    setEditingFeature(null);
    setModalOpen(true);
  }

  async function handleSave(data: {
    companyId?: string;
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
        const updateData = data;
        await api.tickets.update(editingFeature.id, updateData);
        toast.success("Ticket updated");
      } else {
        const companyId = data.companyId;
        if (!companyId) {
          toast.error("Company is required");
          return;
        }
        await api.tickets.create({
          // API contract still accepts legacy workspaceId key; value is canonical company id.
          workspaceId: companyId,
          title: data.title,
          description: data.description,
          type: data.type,
          priority: data.priority,
          sourceProjectId: data.sourceProjectId ?? undefined,
          assigneeMode: data.assigneeMode,
          assigneeAgentDefinitionId: data.assigneeAgentDefinitionId,
        });
        toast.success("Ticket created");
      }
      setModalOpen(false);
      setEditingFeature(null);
      await refreshFeatures();
    } catch (error) {
      toast.error({
        title: editingFeature ? "Couldn't update ticket" : "Couldn't create ticket",
        message: getErrorMessage(error, "Failed to save ticket"),
        details: getErrorDetails(error),
      });
      throw error;
    }
  }

  function handleKickoff(feature: Ticket) {
    setConfirmKickoffFeature(feature);
  }

  async function confirmKickoff() {
    if (!confirmKickoffFeature) return;

    try {
      const { project } = await api.tickets.kickoff(confirmKickoffFeature.id);
      toast.success({
        title: "Kickoff started",
        message: `Project created: ${project.name}`,
        details: "The linked project is now ready for planning.",
      });
      await refreshFeatures();
    } catch (error) {
      toast.error({
        title: "Couldn't kick off ticket",
        message: getErrorMessage(error, "Failed to kickoff"),
        details: getErrorDetails(error),
      });
    }
  }

  function handleDelete(feature: Ticket) {
    setConfirmDeleteFeature(feature);
  }

  async function confirmDelete() {
    if (!confirmDeleteFeature) return;

    try {
      await api.tickets.delete(confirmDeleteFeature.id);
      setFeatures((prev) => prev.filter((f) => f.id !== confirmDeleteFeature.id));
      toast.success("Ticket deleted");
    } catch (error) {
      toast.error({
        title: "Couldn't delete ticket",
        message: getErrorMessage(error, "Failed to delete"),
        details: getErrorDetails(error),
      });
    }
  }

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId);
  const issueMode = typeFilter === "bug";
  const visibleTicketCount = filteredFeatures.length;
  const readyToKickoff = filteredFeatures.filter(
    (feature) => feature.status === "todo" && !feature.orchestrationProjectId,
  ).length;
  const linkedProjectCount = filteredFeatures.filter((feature) => feature.orchestrationProjectId).length;
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
  const companyProjectsHref = selectedCompanyId ? `/companies/${selectedCompanyId}/projects` : "/companies";
  const companyActivityHref = selectedCompanyId ? `/companies/${selectedCompanyId}/activity` : "/companies";
  const boardBreadcrumbs = [
    { label: "Companies", href: "/companies" },
    ...(selectedCompanyId
      ? [
          {
            label: selectedCompany?.name ?? "Company",
            href: `/companies/${selectedCompanyId}`,
          },
        ]
      : []),
    { label: "Tickets" },
  ];
  const boardNextAction =
    readyToKickoff > 0
      ? `Kick off ${readyToKickoff} ready ticket${readyToKickoff === 1 ? "" : "s"}, then monitor linked projects.`
      : activeProjectCount > 0
        ? "Execution is active. Follow project and activity pages to catch blockers quickly."
        : "No ready tickets yet. Refine backlog items and move the next one to Ready.";

  if (loadError) {
    return (
      <div className="kanban-page">
        <Breadcrumbs items={boardBreadcrumbs} />
        <PageErrorState
          title="Ticket board failed to load"
          message={loadError}
          details={loadErrorDetails}
          onRetry={() => void initializeBoard()}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="kanban-page">
        <Breadcrumbs items={boardBreadcrumbs} />
        <PageLoadingState title="Ticket Board" subtitle="Loading tickets and projects..." height={300} />
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="kanban-page">
        <Breadcrumbs items={boardBreadcrumbs} />
        <PageEmptyState
          title="No companies found"
          description="Create a company first to manage tickets on a Kanban board."
          actions={
            <Link href="/companies/new" className="btn btn-primary">
              Create Company
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="kanban-page">
      <Breadcrumbs items={boardBreadcrumbs} />

      <div className="ws-page-header">
        <div className="ws-page-header-row">
          <div>
            <h2 className="ws-page-title">Ticket Board</h2>
            <p className="ws-page-subtitle">
              {selectedCompany
                ? `Plan work inside ${selectedCompany.name}. Use filters to narrow the queue, then kick off tickets when they are ready.`
                : "Use the board to triage tickets, assign agents, and launch work."}
            </p>
          </div>
          <div className="board-header-actions">
            <select
              className="input board-company-select"
              value={selectedCompanyId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleCompanyChange(e.target.value)
              }
              aria-label="Select company"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  {company.name}
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

      <section className="card" style={{ marginBottom: "1rem" }}>
        <div className="flex justify-between items-center" style={{ gap: "0.75rem", flexWrap: "wrap" }}>
          <div>
            <p className="project-card-eyebrow">Next action</p>
            <h3 style={{ margin: 0 }}>Keep signal to action within two clicks</h3>
            <p className="text-sm text-muted" style={{ marginTop: "0.4rem" }}>
              {boardNextAction}
            </p>
          </div>
          <div className="company-empty-actions">
            <Link href={companyProjectsHref} className="btn btn-secondary">
              Open Projects
            </Link>
            <Link href={companyActivityHref} className="btn btn-secondary">
              Open Activity
            </Link>
          </div>
        </div>
      </section>

      {filteredFeatures.length === 0 ? (
        <PageEmptyState
          title={features.length > 0 ? "No tickets match these filters" : "No tickets yet"}
          description={
            features.length > 0
              ? "Try a different search, clear the filters, or switch to another status lane."
              : issueMode
                ? "No issues exist yet. Create one from this board or from a project page."
                : "Add your first ticket to the backlog and start organizing."
          }
          actions={
            <div className="company-empty-actions">
              {features.length > 0 && (
                <button type="button" className="btn btn-secondary" onClick={clearFilters}>
                  Clear filters
                </button>
              )}
              <button type="button" className="btn btn-primary" onClick={handleNewFeature}>
                New Ticket
              </button>
            </div>
          }
        />
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
        companies={companies}
        agents={agents}
        projects={Object.values(projectsById)}
        defaultCompanyId={selectedCompanyId}
        defaultType={issueMode ? "bug" : "feature"}
      />

      <ConfirmModal
        isOpen={Boolean(confirmKickoffFeature)}
        onClose={() => setConfirmKickoffFeature(null)}
        onConfirm={() => void confirmKickoff()}
        title="Start Ticket Execution"
        message={
          confirmKickoffFeature
            ? `Start execution for "${confirmKickoffFeature.title}"? This creates a linked project.`
            : "Start execution for this ticket?"
        }
        confirmText="Kickoff"
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteFeature)}
        onClose={() => setConfirmDeleteFeature(null)}
        onConfirm={() => void confirmDelete()}
        title="Delete Ticket"
        message={
          confirmDeleteFeature
            ? `Delete "${confirmDeleteFeature.title}"? This cannot be undone.`
            : "Delete this ticket?"
        }
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}
