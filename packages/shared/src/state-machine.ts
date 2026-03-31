import type { AgentTaskStatus, ProjectStatus, WorkstreamStatus } from "./types/index.js";

export const PROJECT_TRANSITIONS: Record<ProjectStatus, readonly ProjectStatus[]> = {
  draft: ["planning", "archived"],
  planning: ["in_progress", "failed", "cancelled"],
  in_progress: ["completed", "failed", "cancelled"],
  completed: ["archived"],
  failed: ["draft", "archived"],
  cancelled: ["draft", "archived"],
  archived: [],
};

export const WORKSTREAM_TRANSITIONS: Record<WorkstreamStatus, readonly WorkstreamStatus[]> = {
  pending: ["blocked", "in_progress", "failed"],
  blocked: ["pending", "in_progress", "failed"],
  in_progress: ["completed", "failed"],
  completed: [],
  failed: [],
};

export const TASK_TRANSITIONS: Record<AgentTaskStatus, readonly AgentTaskStatus[]> = {
  queued: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
};

export class InvalidTransitionError extends Error {
  constructor(
    public entity: string,
    public from: string,
    public to: string,
  ) {
    super(`Invalid ${entity} transition: ${from} -> ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition<S extends string>(
  transitions: Record<S, readonly S[]>,
  from: S,
  to: S,
  entity: string,
): void {
  const allowed = transitions[from];
  if (!allowed || !allowed.includes(to)) {
    throw new InvalidTransitionError(entity, from, to);
  }
}
