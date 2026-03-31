"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { FeatureModal } from "../../components/board/FeatureModal";
import { KanbanColumn } from "../../components/board/KanbanColumn";
import { useToastContext } from "../../components/ui/ToastProvider";
import { api, getErrorDetails, getErrorMessage } from "../../lib/api";
import type { Feature, Project, Workspace } from "../../lib/api";

const STATUSES = ["backlog", "todo", "in_progress", "done", "rejected"] as const;

function getStoredWorkspaceId(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("board_workspace_id") || "";
}

function storeWorkspaceId(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("board_workspace_id", id);
  }
}

export default function BoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [features, setFeatures] = useState<Feature[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [projectsById, setProjectsById] = useState<
    Record<string, Pick<Project, "id" | "name" | "status">>
  >({});
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const toast = useToastContext();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  // Load workspaces first, then features for selected workspace
  const fetchWorkspaces = useCallback(async () => {
    try {
      const workspacesData = await api.workspaces.list(100, 0);
      setWorkspaces(workspacesData.data);
      return workspacesData.data;
    } catch (err) {
      toastRef.current.error(err instanceof Error ? err.message : "Failed to load workspaces");
      return [];
    }
  }, []);

  const fetchBoardData = useCallback(async (workspaceId: string) => {
    if (!workspaceId) {
      setFeatures([]);
      setProjectsById({});
      setLoading(false);
      return;
    }
    try {
      const [featuresData, projectsData] = await Promise.all([
        api.workspaces.features(workspaceId),
        api.workspaces.projects(workspaceId, 100, 0, true),
      ]);
      setFeatures(featuresData.data);
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
      const requestedMatch = ws.find((w) => w.id === requestedWorkspaceId);
      const stored = getStoredWorkspaceId();
      const match = ws.find((w) => w.id === stored);
      const initial = requestedMatch?.id || match?.id || ws[0]?.id || "";
      setSelectedWorkspaceId(initial);
      storeWorkspaceId(initial);
      syncWorkspaceContext(initial);
      fetchBoardData(initial);
    });
  }, [fetchWorkspaces, fetchBoardData, searchParams, syncWorkspaceContext]);

  function handleWorkspaceChange(wsId: string) {
    setSelectedWorkspaceId(wsId);
    storeWorkspaceId(wsId);
    syncWorkspaceContext(wsId);
    setLoading(true);
    fetchBoardData(wsId);
  }

  const refreshFeatures = useCallback(async () => {
    if (selectedWorkspaceId) {
      await fetchBoardData(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, fetchBoardData]);

  const featuresByStatus = STATUSES.reduce(
    (acc, status) => {
      acc[status] = features.filter((f) => f.status === status);
      return acc;
    },
    {} as Record<string, Feature[]>,
  );

  async function handleDrop(featureId: string, newStatus: Feature["status"]) {
    const feature = features.find((f) => f.id === featureId);
    if (!feature || feature.status === newStatus) return;

    // Optimistic update
    setFeatures((prev) => prev.map((f) => (f.id === featureId ? { ...f, status: newStatus } : f)));

    try {
      await api.features.update(featureId, { status: newStatus });
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
  }) {
    try {
      if (editingFeature) {
        const { workspaceId: _, ...updateData } = data;
        await api.features.update(editingFeature.id, updateData);
        toast.success("Feature updated");
      } else {
        if (!data.workspaceId) {
          toast.error("Workspace is required");
          return;
        }
        await api.features.create({
          workspaceId: data.workspaceId,
          title: data.title,
          description: data.description,
          type: data.type,
          priority: data.priority,
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
        `Start orchestration for "${feature.title}"? This will create a new project targeting the platform's own repo.`,
      )
    ) {
      return;
    }

    try {
      const { project } = await api.features.kickoff(feature.id);
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
      await api.features.delete(feature.id);
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
  const readyToKickoff = features.filter(
    (feature) => feature.status === "todo" && !feature.orchestrationProjectId,
  ).length;
  const linkedProjectCount = features.filter((feature) => feature.orchestrationProjectId).length;
  const activeProjectCount = Object.values(projectsById).filter((project) =>
    ["planning", "in_progress"].includes(project.status),
  ).length;
  const boardTip =
    readyToKickoff > 0
      ? `${readyToKickoff} feature${readyToKickoff > 1 ? "s are" : " is"} ready to kick off.`
      : activeProjectCount > 0
        ? `${activeProjectCount} linked project${activeProjectCount > 1 ? "s are" : " is"} currently running.`
        : "Move backlog items into Todo when they are ready for orchestration.";

  if (loading) {
    return (
      <div className="kanban-page">
        <Breadcrumbs items={[{ label: "Board" }]} />
        <div className="ws-page-header">
          <div className="ws-page-header-row">
            <div>
              <h2 className="ws-page-title">Feature Board</h2>
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
              <h2 className="ws-page-title">Feature Board</h2>
              <p className="ws-page-subtitle">Manage features across your workspace</p>
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
          <h3 className="workspace-empty-title">No workspaces found</h3>
          <p className="workspace-empty-desc">
            Create a workspace first to manage features on a Kanban board.
          </p>
          <Link href="/workspaces/new" className="btn btn-primary">
            Create Workspace
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
            <h2 className="ws-page-title">Feature Board</h2>
            <p className="ws-page-subtitle">
              {selectedWorkspace
                ? `Plan work inside ${selectedWorkspace.name}. Move items to Todo, then kick off orchestration when they are ready.`
                : "Drag features between columns. Kickoff from Todo to start self-improvement."}
            </p>
          </div>
          <div className="board-header-actions">
            <select
              className="input board-workspace-select"
              value={selectedWorkspaceId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleWorkspaceChange(e.target.value)
              }
              aria-label="Select workspace"
            >
              {workspaces.map((ws) => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn btn-primary" onClick={handleNewFeature}>
              New Feature
            </button>
          </div>
        </div>
      </div>

      <div className="board-overview">
        <div className="board-stats">
          <div className="board-stat">
            <span className="board-stat-value">{features.length}</span>
            <span className="board-stat-label">Features</span>
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

      {features.length === 0 ? (
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
          <h3 className="workspace-empty-title">No features yet</h3>
          <p className="workspace-empty-desc">
            Add your first feature to the backlog and start organizing.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleNewFeature}>
            New Feature
          </button>
        </div>
      ) : (
        <div className="board-shell">
          <div className="kanban-board">
            {STATUSES.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                features={featuresByStatus[status] || []}
                linkedProjects={projectsById}
                onDrop={handleDrop}
                onEdit={handleEdit}
                onKickoff={handleKickoff}
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
        defaultWorkspaceId={selectedWorkspaceId}
      />
    </div>
  );
}
