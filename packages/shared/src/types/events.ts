export type OrchestratorEvent =
  | { type: "workspace.created"; payload: { workspaceId: string } }
  | { type: "workspace.updated"; payload: { workspaceId: string } }
  | { type: "workspace.deleted"; payload: { workspaceId: string } }
  | { type: "project.created"; payload: { projectId: string } }
  | { type: "project.planning_started"; payload: { projectId: string } }
  | { type: "project.planning_completed"; payload: { projectId: string; workstreamIds: string[] } }
  | { type: "project.failed"; payload: { projectId: string; error: string } }
  | { type: "workstream.started"; payload: { workstreamId: string; projectId: string } }
  | {
      type: "workstream.completed";
      payload: {
        workstreamId: string;
        projectId: string;
        validationResult?: { status: string; output: string };
      };
    }
  | {
      type: "workstream.failed";
      payload: { workstreamId: string; projectId: string; error: string };
    }
  | { type: "task.queued"; payload: { taskId: string; projectId: string; workstreamId: string } }
  | { type: "task.started"; payload: { taskId: string; projectId: string } }
  | {
      type: "task.completed";
      payload: { taskId: string; projectId: string; filesModified: string[] };
    }
  | { type: "task.failed"; payload: { taskId: string; projectId: string; error: string } }
  | {
      type: "task.delegated";
      payload: { parentTaskId: string; childTaskIds: string[]; tier: string };
    }
  | { type: "task.subtree_completed"; payload: { rootTaskId: string; parentTaskId: string } }
  | {
      type: "escalation.created";
      payload: {
        escalationId: string;
        taskId: string;
        projectId: string;
        fromTier: string;
        toTier: string;
      };
    }
  | {
      type: "escalation.resolved";
      payload: { escalationId: string; projectId: string; resolution: string };
    }
  | { type: "escalation.dismissed"; payload: { escalationId: string; projectId: string } }
  | {
      type: "review.created";
      payload: { reviewId: string; taskId: string; projectId: string; verdict: string };
    }
  | {
      type: "review.rework_requested";
      payload: { taskId: string; reviewId: string; projectId: string; iteration: number };
    };

export type EventType = OrchestratorEvent["type"];
export type EventPayload<T extends EventType> = Extract<OrchestratorEvent, { type: T }>["payload"];

export const EVENTS_CHANNEL = "orchestration:events";
