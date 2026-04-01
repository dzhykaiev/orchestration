"use client";

import Link from "next/link";
import type { Feature, Project } from "../../lib/api";
import { StatusBadge } from "../ui/StatusBadge";

const TYPE_LABELS: Record<string, string> = {
  feature: "Ticket",
  bug: "Issue",
  improvement: "Improvement",
  refactor: "Refactor",
};

const PRIORITY_LABELS: Record<number, string> = {
  0: "Low",
  1: "Medium",
  2: "High",
  3: "Critical",
};

const STATUS_ACTIONS: Record<
  Feature["status"],
  { label: string; status: Feature["status"] }
> = {
  backlog: { label: "Move to Todo", status: "todo" },
  todo: { label: "Start", status: "in_progress" },
  in_progress: { label: "Done", status: "done" },
  done: { label: "Reopen", status: "todo" },
  rejected: { label: "Reopen", status: "backlog" },
};

interface FeatureCardProps {
  feature: Feature;
  linkedProject?: Pick<Project, "id" | "name" | "status">;
  sourceProject?: Pick<Project, "id" | "name" | "status">;
  assigneeLabel?: string;
  onEdit: (feature: Feature) => void;
  onKickoff?: (feature: Feature) => void;
  onStatusChange?: (feature: Feature, newStatus: Feature["status"]) => void;
  onDelete: (feature: Feature) => void;
}

export function FeatureCard({
  feature,
  linkedProject,
  sourceProject,
  assigneeLabel,
  onEdit,
  onKickoff,
  onStatusChange,
  onDelete,
}: FeatureCardProps) {
  const quickAction = STATUS_ACTIONS[feature.status];

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData("text/plain", feature.id);
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: drag-and-drop card
    <div
      className="feature-card"
      draggable
      onDragStart={handleDragStart}
      onClick={() => onEdit(feature)}
    >
      <div className="feature-card-header">
        <span className={`feature-type-badge feature-type-${feature.type}`}>
          {TYPE_LABELS[feature.type] || feature.type}
        </span>
        <span className={`feature-priority feature-priority-${feature.priority}`}>
          {PRIORITY_LABELS[feature.priority] || "Low"}
        </span>
      </div>
      <h4 className="feature-card-title">{feature.title}</h4>
      <div className="feature-card-meta">
        <div className="feature-card-meta-row">
          <span className="feature-card-meta-label">Assignee</span>
          <span className="feature-card-meta-value">{assigneeLabel ?? "Main orchestrator"}</span>
        </div>
        {feature.sourceProjectId && (
          <div className="feature-card-meta-row">
            <span className="feature-card-meta-label">Source</span>
            <Link
              href={`/projects/${feature.sourceProjectId}`}
              onClick={(e) => e.stopPropagation()}
              className="feature-project-link"
            >
              {sourceProject?.name ?? "Project"}
            </Link>
          </div>
        )}
      </div>
      {feature.description && (
        <p className="feature-card-desc">
          {feature.description.length > 120
            ? `${feature.description.slice(0, 120)}...`
            : feature.description}
        </p>
      )}
      {feature.orchestrationProjectId && (
        <div className="feature-project-meta">
          <div className="feature-project-meta-top">
            <span className="feature-project-label">Execution project</span>
            {linkedProject && <StatusBadge status={linkedProject.status} />}
          </div>
          <Link
            href={`/projects/${feature.orchestrationProjectId}`}
            onClick={(e) => e.stopPropagation()}
            className="feature-project-link"
          >
            {linkedProject?.name || "Open project"}
          </Link>
        </div>
      )}
      <div className="feature-card-footer">
        <div className="feature-card-actions">
          {feature.orchestrationProjectId ? (
            <Link
              href={`/projects/${feature.orchestrationProjectId}`}
              className="btn btn-sm btn-secondary"
              onClick={(e) => e.stopPropagation()}
            >
              Open project
            </Link>
          ) : (
            onKickoff &&
            feature.status === "todo" && (
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onKickoff(feature);
                }}
              >
                Kickoff
              </button>
            )
          )}
          {onStatusChange && quickAction && (
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange(feature, quickAction.status);
              }}
            >
              {quickAction.label}
            </button>
          )}
        </div>
        <button
          type="button"
          className="btn btn-danger-sm"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(feature);
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
