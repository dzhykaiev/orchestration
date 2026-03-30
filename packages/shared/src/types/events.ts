export type OrchestratorEvent =
  | { type: "project.created"; payload: { projectId: string } }
  | { type: "project.planning_started"; payload: { projectId: string } }
  | { type: "project.planning_completed"; payload: { projectId: string; workstreamIds: string[] } }
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
  | { type: "task.queued"; payload: { taskId: string; workstreamId: string } }
  | { type: "task.started"; payload: { taskId: string } }
  | { type: "task.completed"; payload: { taskId: string; filesModified: string[] } }
  | { type: "task.failed"; payload: { taskId: string; error: string } };

export type EventType = OrchestratorEvent["type"];
export type EventPayload<T extends EventType> = Extract<OrchestratorEvent, { type: T }>["payload"];

export const EVENTS_CHANNEL = "orchestration:events";
