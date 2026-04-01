"use client";

import { useState } from "react";
import type { Feature, Project } from "../../lib/api";
import { FeatureCard } from "./FeatureCard";

const STATUS_META: Record<Feature["status"], { label: string; subtitle: string; color: string }> = {
  backlog: {
    label: "Backlog",
    subtitle: "Ideas, requests, and work that still needs triage.",
    color: "var(--color-neutral-bg)",
  },
  todo: {
    label: "Ready",
    subtitle: "Briefs that are clear enough to start or kickoff.",
    color: "var(--color-blue-bg)",
  },
  in_progress: {
    label: "In progress",
    subtitle: "Agents are actively working on the ticket.",
    color: "var(--color-yellow-bg)",
  },
  done: {
    label: "Done",
    subtitle: "Completed work that is ready to close out.",
    color: "var(--color-green-bg)",
  },
  rejected: {
    label: "Rejected",
    subtitle: "Not moving forward or intentionally parked.",
    color: "var(--color-red-bg)",
  },
};

interface KanbanColumnProps {
  status: Feature["status"];
  features: Feature[];
  linkedProjects: Record<string, Pick<Project, "id" | "name" | "status">>;
  assigneeNamesById?: Record<string, string>;
  onDrop: (featureId: string, newStatus: Feature["status"]) => void;
  onEdit: (feature: Feature) => void;
  onKickoff?: (feature: Feature) => void;
  onStatusChange?: (feature: Feature, newStatus: Feature["status"]) => void;
  onDelete: (feature: Feature) => void;
}

export function KanbanColumn({
  status,
  features,
  linkedProjects,
  assigneeNamesById = {},
  onDrop,
  onEdit,
  onKickoff,
  onStatusChange,
  onDelete,
}: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);
  const meta = STATUS_META[status];

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const featureId = e.dataTransfer.getData("text/plain");
    if (featureId) {
      onDrop(featureId, status);
    }
  }

  return (
    <div
      className={`kanban-column ${dragOver ? "kanban-column-drag-over" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="kanban-column-header" style={{ borderTopColor: meta.color }}>
        <div className="kanban-column-heading">
          <span className="kanban-column-title">{meta.label}</span>
          <span className="kanban-column-subtitle">{meta.subtitle}</span>
        </div>
        <span className="kanban-column-count">{features.length}</span>
      </div>
      <div className="kanban-column-body">
        {features
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              linkedProject={
                feature.orchestrationProjectId
                  ? linkedProjects[feature.orchestrationProjectId]
                  : undefined
              }
              sourceProject={feature.sourceProjectId ? linkedProjects[feature.sourceProjectId] : undefined}
              assigneeLabel={
                feature.assigneeMode === "orchestrator"
                  ? "Main orchestrator"
                  : assigneeNamesById[feature.assigneeAgentDefinitionId ?? ""] || "Assigned agent"
              }
              onEdit={onEdit}
              onKickoff={onKickoff}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
            />
          ))}
      </div>
    </div>
  );
}
