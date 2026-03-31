import type { OrchestratorEvent } from "@orchestration/shared";

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  projectId?: string;
}

let counter = 0;

export function formatEventDescription(event: OrchestratorEvent): string {
  switch (event.type) {
    case "workspace.created":
      return "Workspace created";
    case "workspace.updated":
      return "Workspace updated";
    case "workspace.deleted":
      return "Workspace deleted";
    case "project.created":
      return "New project created";
    case "project.planning_started":
      return "Planning started";
    case "project.planning_completed":
      return `Planning completed — ${event.payload.workstreamIds.length} workstreams`;
    case "project.failed":
      return `Project failed: ${event.payload.error}`;
    case "workstream.started":
      return "Workstream started";
    case "workstream.completed":
      return "Workstream completed";
    case "workstream.failed":
      return "Workstream failed";
    case "task.queued":
      return "Agent task queued";
    case "task.started":
      return "Agent task started";
    case "task.completed":
      return `Agent task completed — ${event.payload.filesModified.length} files modified`;
    case "task.failed":
      return "Agent task failed";
    case "task.delegated":
      return `Task delegated to ${event.payload.tier} (${event.payload.childTaskIds.length} subtasks)`;
    case "task.subtree_completed":
      return "Subtask tree completed";
    case "escalation.created":
      return `Escalation: ${event.payload.fromTier} → ${event.payload.toTier}`;
    case "escalation.resolved":
      return "Escalation resolved";
    case "escalation.dismissed":
      return "Escalation dismissed";
    case "review.created":
      return `Review: ${event.payload.verdict}`;
    case "review.rework_requested":
      return `Rework requested (iteration ${event.payload.iteration})`;
  }
}

function getProjectId(event: OrchestratorEvent): string | undefined {
  const p = event.payload as Record<string, unknown>;
  if (typeof p.projectId === "string") return p.projectId;
  return undefined;
}

export function eventToActivity(event: OrchestratorEvent): ActivityItem {
  counter++;
  return {
    id: `${event.type}-${Date.now()}-${counter}`,
    type: event.type,
    description: formatEventDescription(event),
    timestamp: new Date(),
    projectId: getProjectId(event),
  };
}
