import type { CreateEscalationInput } from "@orchestration/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function createEscalation(input: CreateEscalationInput) {
  const [escalation] = await db
    .insert(schema.escalations)
    .values({
      taskId: input.taskId,
      projectId: input.projectId,
      fromTier: input.fromTier,
      toTier: input.toTier,
      reason: input.reason,
      context: input.context ?? {},
    })
    .returning();

  return escalation ?? null;
}

export async function getEscalationById(id: string) {
  const result = await db
    .select()
    .from(schema.escalations)
    .where(eq(schema.escalations.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function listByProject(
  projectId: string,
  opts: { status?: string; limit: number; offset: number },
) {
  const conditions = [eq(schema.escalations.projectId, projectId)];
  if (opts.status) {
    conditions.push(
      eq(schema.escalations.status, opts.status as typeof schema.escalations.$inferSelect.status),
    );
  }
  const where = and(...conditions);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(schema.escalations)
      .where(where)
      .orderBy(desc(schema.escalations.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.escalations).where(where),
  ]);

  return { escalations: items, total: countResult[0]?.count ?? 0 };
}

export async function resolveEscalation(id: string, resolution: string) {
  const [escalation] = await db
    .update(schema.escalations)
    .set({ status: "resolved", resolution, resolvedAt: new Date(), updatedAt: new Date() })
    .where(eq(schema.escalations.id, id))
    .returning();
  return escalation ?? null;
}

export async function dismissEscalation(id: string) {
  const [escalation] = await db
    .update(schema.escalations)
    .set({ status: "dismissed", updatedAt: new Date() })
    .where(eq(schema.escalations.id, id))
    .returning();
  return escalation ?? null;
}
