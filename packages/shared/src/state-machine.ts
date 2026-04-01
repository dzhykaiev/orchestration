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

export function canProjectTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return canTransition(PROJECT_TRANSITIONS, from, to);
}

export function canFeatureTransition(from: FeatureStatus, to: FeatureStatus): boolean {
  return canTransition(FEATURE_TRANSITIONS, from, to);
}

export function canWorkstreamTransition(from: WorkstreamStatus, to: WorkstreamStatus): boolean {
  return canTransition(WORKSTREAM_TRANSITIONS, from, to);
}

export function canTaskTransition(from: AgentTaskStatus, to: AgentTaskStatus): boolean {
  return canTransition(TASK_TRANSITIONS, from, to);
}

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

export function assertProjectTransition(from: ProjectStatus, to: ProjectStatus): void {
  assertTransition(PROJECT_TRANSITIONS, from, to, "project");
}

export function assertFeatureTransition(from: FeatureStatus, to: FeatureStatus): void {
  assertTransition(FEATURE_TRANSITIONS, from, to, "feature");
}

export function assertWorkstreamTransition(from: WorkstreamStatus, to: WorkstreamStatus): void {
  assertTransition(WORKSTREAM_TRANSITIONS, from, to, "workstream");
}

export function assertTaskTransition(from: AgentTaskStatus, to: AgentTaskStatus): void {
  assertTransition(TASK_TRANSITIONS, from, to, "task");
}
