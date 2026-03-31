"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Breadcrumbs } from "../../components/Breadcrumbs";
import { FeatureModal } from "../../components/board/FeatureModal";
import { KanbanColumn } from "../../components/board/KanbanColumn";
import { useToast } from "../../hooks/useToast";
import { api } from "../../lib/api";
import type { Feature, Workspace } from "../../lib/api";

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
  const [features, setFeatures] = useState<Feature[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const toast = useToast();
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

  const fetchFeatures = useCallback(async (workspaceId: string) => {
    if (!workspaceId) {
      setFeatures([]);
      setLoading(false);
      return;
    }
    try {
      const featuresData = await api.workspaces.features(workspaceId);
      setFeatures(featuresData.data);
    } catch (err) {
      toastRef.current.error(err instanceof Error ? err.message : "Failed to load features");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspaces().then((ws) => {
      if (ws.length === 0) {
        setLoading(false);
        return;
      }
      const stored = getStoredWorkspaceId();
      const match = ws.find((w) => w.id === stored);
      const initial = match ? match.id : ws[0]?.id || "";
      setSelectedWorkspaceId(initial);
      storeWorkspaceId(initial);
      fetchFeatures(initial);
    });
  }, [fetchWorkspaces, fetchFeatures]);

  function handleWorkspaceChange(wsId: string) {
    setSelectedWorkspaceId(wsId);
    storeWorkspaceId(wsId);
    setLoading(true);
    fetchFeatures(wsId);
  }

  const refreshFeatures = useCallback(async () => {
    if (selectedWorkspaceId) {
      await fetchFeatures(selectedWorkspaceId);
    }
  }, [selectedWorkspaceId, fetchFeatures]);

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
      toast.error("Failed to update status");
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
      toast.error(err instanceof Error ? err.message : "Failed to save feature");
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
      toast.success(`Project created: ${project.name}`);
      await refreshFeatures();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to kickoff");
    }
  }

  async function handleDelete(feature: Feature) {
    if (!confirm(`Delete "${feature.title}"?`)) return;

    try {
      await api.features.delete(feature.id);
      setFeatures((prev) => prev.filter((f) => f.id !== feature.id));
      toast.success("Feature deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    }
  }

  const selectedWorkspace = workspaces.find((w) => w.id === selectedWorkspaceId);

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
              Drag features between columns. Kickoff from Todo to start self-improvement.
            </p>
          </div>
          <div className="flex gap-2">
            <select
              className="input"
              value={selectedWorkspaceId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                handleWorkspaceChange(e.target.value)
              }
              aria-label="Select workspace"
              style={{ padding: "0.375rem 0.625rem", width: "auto", minWidth: 160 }}
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

      {features.length === 0 ? (
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
        <div className="kanban-board">
          {STATUSES.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              features={featuresByStatus[status] || []}
              onDrop={handleDrop}
              onEdit={handleEdit}
              onKickoff={handleKickoff}
              onDelete={handleDelete}
            />
          ))}
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
      />
    </div>
  );
}
