import type { CreateFeatureInput, UpdateFeatureInput } from "@orchestration/shared";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function listFeatures(opts: { status?: string; limit: number; offset: number }) {
  const base = db.select().from(schema.features);
  const countBase = db.select({ count: sql<number>`count(*)::int` }).from(schema.features);

  if (opts.status) {
    const statusVal = opts.status as typeof schema.features.$inferSelect.status;
    const [items, countResult] = await Promise.all([
      base
        .where(eq(schema.features.status, statusVal))
        .orderBy(asc(schema.features.sortOrder), desc(schema.features.createdAt))
        .limit(opts.limit)
        .offset(opts.offset),
      countBase.where(eq(schema.features.status, statusVal)),
    ]);
    return { features: items, total: countResult[0]?.count ?? 0 };
  }

  const [items, countResult] = await Promise.all([
    base
      .orderBy(asc(schema.features.sortOrder), desc(schema.features.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    countBase,
  ]);

  return { features: items, total: countResult[0]?.count ?? 0 };
}

export async function getFeatureById(id: string) {
  const result = await db.select().from(schema.features).where(eq(schema.features.id, id)).limit(1);

  return result[0] ?? null;
}

export async function createFeature(input: CreateFeatureInput) {
  const [feature] = await db
    .insert(schema.features)
    .values({
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      type: input.type || "feature",
      priority: input.priority ?? 0,
    })
    .returning();

  // biome-ignore lint/style/noNonNullAssertion: insert always returns a row
  return feature!;
}

export async function updateFeature(id: string, input: UpdateFeatureInput) {
  const [feature] = await db
    .update(schema.features)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.features.id, id))
    .returning();

  return feature ?? null;
}

export async function deleteFeature(id: string) {
  await db.delete(schema.features).where(eq(schema.features.id, id));
}

export async function reorderFeatures(updates: { id: string; sortOrder: number }[]) {
  if (updates.length === 0) return;

  // Batch update using a single query with CASE expression
  const ids = updates.map((u) => u.id);
  const caseParts = updates.map(
    (u) => sql`when ${schema.features.id} = ${u.id} then ${u.sortOrder}`,
  );

  await db
    .update(schema.features)
    .set({
      sortOrder: sql`case ${sql.join(caseParts, sql` `)} end`,
      updatedAt: new Date(),
    })
    .where(sql`${schema.features.id} = any(${ids})`);
}
