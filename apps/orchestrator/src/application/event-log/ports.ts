import type { OrchestratorEvent } from "@orchestration/shared";

export interface EventLogDependencies {
  insertAuditLog(input: {
    entityType: string;
    entityId: string;
    action:
      | "created"
      | "updated"
      | "status_changed"
      | "delegated"
      | "escalated"
      | "completed"
      | "failed"
      | "reviewed";
    actorType: "agent" | "system" | "user";
    actorId?: string | null;
    projectId?: string | null;
    workspaceId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<unknown>;
  listProjectEvents(projectId: string, limit: number): Promise<unknown[]>;
  deleteOldEvents(cutoff: Date): Promise<{ rowCount?: number } | unknown>;
}

export interface EventLogService {
  persistEvent(event: OrchestratorEvent): Promise<void>;
  listEventsByProject(projectId: string, limit?: number): Promise<unknown[]>;
  purgeOldEvents(olderThanDays?: number): Promise<number>;
}
