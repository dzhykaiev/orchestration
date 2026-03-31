import { db, schema } from "@orchestration/db";
import { and, desc, eq, lt } from "drizzle-orm";
import type { EventLogDependencies } from "../../application/event-log/ports.js";

export const defaultEventLogDependencies: EventLogDependencies = {
  insertAuditLog(input) {
    return db.insert(schema.auditLogs).values(input);
  },
  listProjectEvents(projectId, limit) {
    return db
      .select()
      .from(schema.auditLogs)
      .where(
        and(eq(schema.auditLogs.projectId, projectId), eq(schema.auditLogs.entityType, "event")),
      )
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(limit);
  },
  deleteOldEvents(cutoff) {
    return db
      .delete(schema.auditLogs)
      .where(and(eq(schema.auditLogs.entityType, "event"), lt(schema.auditLogs.createdAt, cutoff)));
  },
};
