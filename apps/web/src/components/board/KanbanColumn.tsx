"use client";

import { useState } from "react";
import type { Feature } from "../../lib/api";
import { FeatureCard } from "./FeatureCard";

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  rejected: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  backlog: "var(--color-neutral-bg, #e2e8f0)",
  todo: "var(--color-blue-bg, #dbeafe)",
  in_progress: "var(--color-yellow-bg, #fef3c7)",
  done: "var(--color-green-bg, #d1fae5)",
  rejected: "var(--color-red-bg, #fee2e2)",
};

interface KanbanColumnProps {
  status: Feature["status"];
  features: Feature[];
  onDrop: (featureId: string, newStatus: Feature["status"]) => void;
  onEdit: (feature: Feature) => void;
  onKickoff?: (feature: Feature) => void;
  onDelete: (feature: Feature) => void;
}

export function KanbanColumn({
  status,
  features,
  onDrop,
  onEdit,
  onKickoff,
  onDelete,
}: KanbanColumnProps) {
  const [dragOver, setDragOver] = useState(false);

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
      <div className="kanban-column-header" style={{ borderTopColor: STATUS_COLORS[status] }}>
        <span className="kanban-column-title">{STATUS_LABELS[status] || status}</span>
        <span className="kanban-column-count">{features.length}</span>
      </div>
      <div className="kanban-column-body">
        {features
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((feature) => (
            <FeatureCard
              key={feature.id}
              feature={feature}
              onEdit={onEdit}
              onKickoff={onKickoff}
              onDelete={onDelete}
            />
          ))}
      </div>
    </div>
  );
}
