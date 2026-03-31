import type {
  AgentTaskStatus,
  FeatureStatus,
  ProjectStatus,
  WorkstreamStatus,
} from "./types/index.js";

export type TransitionMap<S extends string> = Record<S, readonly S[]>;

export const PROJECT_TRANSITIONS: TransitionMap<ProjectStatus> = {
  draft: ["planning", "cancelled"],
  planning: ["in_progress", "cancelled", "failed"],
  in_progress: ["completed", "failed", "cancelled"],
  completed: ["archived"],
  failed: ["archived"],
  cancelled: ["archived"],
  archived: [],
};

export const FEATURE_TRANSITIONS: TransitionMap<FeatureStatus> = {
  backlog: ["todo", "in_progress", "rejected"],
  todo: ["in_progress", "rejected"],
  in_progress: ["done", "rejected"],
  done: [],
  rejected: [],
};

export const WORKSTREAM_TRANSITIONS: TransitionMap<WorkstreamStatus> = {
  pending: ["blocked", "in_progress"],
  blocked: ["in_progress", "failed"],
  in_progress: ["completed", "failed"],
  completed: [],
  failed: [],
};

export const TASK_TRANSITIONS: TransitionMap<AgentTaskStatus> = {
  queued: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
};

export function canTransition<S extends string>(map: TransitionMap<S>, from: S, to: S): boolean {
  return map[from]?.includes(to) ?? false;
}

export class InvalidTransitionError extends Error {
  public readonly statusCode = 409;

  constructor(
    public entity: string,
    public from: string,
    public to: string,
  ) {
    super(`Cannot transition ${entity} from "${from}" to "${to}"`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition<S extends string>(
  transitions: TransitionMap<S>,
  from: S,
  to: S,
  entity: string,
): void {
  if (!canTransition(transitions, from, to)) {
    throw new InvalidTransitionError(entity, from, to);
  }
}
