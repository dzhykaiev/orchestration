import type { CreateAuditLogInput } from "@orchestration/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function createAuditLog(input: CreateAuditLogInput) {
  const [log] = await db
    .insert(schema.auditLogs)
    .values({
      workspaceId: input.workspaceId,
      projectId: input.projectId,
      entityType: input.entityType,
      entityId: input.entityId,
      action: input.action,
      actorType: input.actorType,
      actorId: input.actorId,
      metadata: input.metadata ?? {},
    })
    .returning();

  return log ?? null;
}

export async function listByEntity(
  entityType: string,
  entityId: string,
  opts: { limit: number; offset: number },
) {
  const where = and(
    eq(schema.auditLogs.entityType, entityType),
    eq(schema.auditLogs.entityId, entityId),
  );

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(schema.auditLogs)
      .where(where)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.auditLogs).where(where),
  ]);

  return { data: items, total: countResult[0]?.count ?? 0 };
}

export async function listByProject(projectId: string, opts: { limit: number; offset: number }) {
  const where = eq(schema.auditLogs.projectId, projectId);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(schema.auditLogs)
      .where(where)
      .orderBy(desc(schema.auditLogs.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.auditLogs).where(where),
  ]);

  return { data: items, total: countResult[0]?.count ?? 0 };
}
