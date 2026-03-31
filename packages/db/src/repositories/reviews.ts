import type { CreateReviewInput } from "@orchestration/shared";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function createReview(input: CreateReviewInput) {
  const [review] = await db
    .insert(schema.reviews)
    .values({
      taskId: input.taskId,
      workstreamId: input.workstreamId,
      projectId: input.projectId,
      verdict: input.verdict,
      feedback: input.feedback,
      requestedChanges: input.requestedChanges ?? [],
      iteration: input.iteration ?? 1,
    })
    .returning();

  return review ?? null;
}

export async function listByTask(taskId: string) {
  return db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.taskId, taskId))
    .orderBy(desc(schema.reviews.createdAt));
}

export async function listByWorkstream(
  workstreamId: string,
  opts: { limit: number; offset: number },
) {
  const where = eq(schema.reviews.workstreamId, workstreamId);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(schema.reviews)
      .where(where)
      .orderBy(desc(schema.reviews.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.reviews).where(where),
  ]);

  return { reviews: items, total: countResult[0]?.count ?? 0 };
}

export async function getLatestReview(taskId: string) {
  const result = await db
    .select()
    .from(schema.reviews)
    .where(eq(schema.reviews.taskId, taskId))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(1);

  return result[0] ?? null;
}
