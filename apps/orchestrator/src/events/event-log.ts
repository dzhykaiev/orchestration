import { db, schema } from "@orchestration/db";
import type { OrchestratorEvent } from "@orchestration/shared";
import { and, desc, eq, lt } from "drizzle-orm";

function extractEntityId(event: OrchestratorEvent): string {
  const p = event.payload as Record<string, unknown>;
  return (p.taskId ||
    p.workstreamId ||
    p.projectId ||
    "00000000-0000-0000-0000-000000000000") as string;
}

function extractProjectId(event: OrchestratorEvent): string | null {
  const p = event.payload as Record<string, unknown>;
  return (p.projectId as string) ?? null;
}

export async function persistEvent(event: OrchestratorEvent): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
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
      } as Record<string, unknown>,
    });
  } catch (err) {
    console.warn("[EventLog] Failed to persist event:", err);
  }
}

export async function listEventsByProject(projectId: string, limit = 100) {
  return db
    .select()
    .from(schema.auditLogs)
    .where(and(eq(schema.auditLogs.projectId, projectId), eq(schema.auditLogs.entityType, "event")))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(limit);
}

export async function purgeOldEvents(olderThanDays = 7): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

  const result = await db
    .delete(schema.auditLogs)
    .where(and(eq(schema.auditLogs.entityType, "event"), lt(schema.auditLogs.createdAt, cutoff)));

  return (result as { rowCount?: number }).rowCount ?? 0;
}
