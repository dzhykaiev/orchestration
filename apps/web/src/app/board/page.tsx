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
      <div>
        <Breadcrumbs items={[{ label: "Board" }]} />
        <h2>Feature Board</h2>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div>
        <Breadcrumbs items={[{ label: "Board" }]} />
        <h2>Feature Board</h2>
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="text-muted mb-2">Create a workspace to manage features.</p>
          <Link href="/workspaces" className="btn btn-primary">
            Create Workspace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="kanban-page">
      <Breadcrumbs items={[{ label: "Board" }]} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Feature Board</h2>
          <p className="text-muted" style={{ margin: "0.25rem 0 0" }}>
            Drag features between columns. Kickoff from Todo to start self-improvement.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <select
            className="input"
            value={selectedWorkspaceId}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleWorkspaceChange(e.target.value)
            }
            aria-label="Select workspace"
            style={{ padding: "0.35rem 0.5rem", width: "auto", minWidth: 180 }}
          >
            {workspaces.map((ws) => (
              <option key={ws.id} value={ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
          <button type="button" className="btn btn-primary" onClick={handleNewFeature}>
            + New Feature
          </button>
        </div>
      </div>

      {features.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem" }}>
          <p className="text-muted mb-2">
            No features in this workspace. Add your first feature to the backlog.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleNewFeature}>
            + New Feature
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
