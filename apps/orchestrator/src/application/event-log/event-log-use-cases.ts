import type { OrchestratorEvent } from "@orchestration/shared";
import type { EventLogDependencies, EventLogService } from "./ports.js";

const UNKNOWN_ENTITY_ID = "00000000-0000-0000-0000-000000000000";

function extractEntityId(event: OrchestratorEvent): string {
  const p = event.payload as Record<string, unknown>;
  return (p.taskId || p.workstreamId || p.projectId || UNKNOWN_ENTITY_ID) as string;
}

function extractProjectId(event: OrchestratorEvent): string | null {
  const p = event.payload as Record<string, unknown>;
  return (p.projectId as string) ?? null;
}

export function createEventLogService(deps: EventLogDependencies): EventLogService {
  return {
    async persistEvent(event: OrchestratorEvent): Promise<void> {
      try {
        await deps.insertAuditLog({
          entityType: "event",
          entityId: extractEntityId(event),
          action: "status_changed",
          actorType: "system",
          actorId: event.type,
          projectId: extractProjectId(event),
          workspaceId: null,
          metadata: {
            eventType: event.type,
            payload: event.payload,
          },
        });
      } catch (err) {
        console.warn("[EventLog] Failed to persist event:", err);
      }
    },

    listEventsByProject(projectId: string, limit = 100) {
      return deps.listProjectEvents(projectId, limit);
    },

    async purgeOldEvents(olderThanDays = 7): Promise<number> {
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      const result = await deps.deleteOldEvents(cutoff);
      return (result as { rowCount?: number }).rowCount ?? 0;
    },
  };
}
