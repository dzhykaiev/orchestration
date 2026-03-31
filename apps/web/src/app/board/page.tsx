"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeatureModal } from "../../components/board/FeatureModal";
import { KanbanColumn } from "../../components/board/KanbanColumn";
import { useToast } from "../../hooks/useToast";
import { api } from "../../lib/api";
import type { Feature, Workspace } from "../../lib/api";

const STATUSES = ["backlog", "todo", "in_progress", "done", "rejected"] as const;

export default function BoardPage() {
  const [features, setFeatures] = useState<Feature[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<Feature | null>(null);
  const toast = useToast();
  const toastRef = useRef(toast);
  toastRef.current = toast;

  const fetchFeatures = useCallback(async () => {
    try {
      const [featuresData, workspacesData] = await Promise.all([
        api.features.list(),
        api.workspaces.list(100, 0),
      ]);
      setFeatures(featuresData.data);
      setWorkspaces(workspacesData.data);
    } catch (err) {
      toastRef.current.error(err instanceof Error ? err.message : "Failed to load features");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

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
      await fetchFeatures();
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
      await fetchFeatures();
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

  if (loading) {
    return (
      <div>
        <h2>Feature Board</h2>
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="kanban-page">
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
        <button type="button" className="btn btn-primary" onClick={handleNewFeature}>
          + New Feature
        </button>
      </div>

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
