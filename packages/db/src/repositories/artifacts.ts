import type { ArtifactType, CreateArtifactInput } from "@orchestration/shared";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function createArtifact(input: CreateArtifactInput) {
  const content = input.content;
  const [artifact] = await db
    .insert(schema.artifacts)
    .values({
      taskId: input.taskId,
      workstreamId: input.workstreamId,
      projectId: input.projectId,
      type: input.type,
      name: input.name,
      content,
      metadata: input.metadata ?? {},
      sizeBytes: Buffer.byteLength(content, "utf-8"),
    })
    .returning();

  return artifact ?? null;
}

export async function listByProject(
  projectId: string,
  opts: { type?: ArtifactType; limit: number; offset: number },
) {
  const conditions = [eq(schema.artifacts.projectId, projectId)];
  if (opts.type) {
    conditions.push(eq(schema.artifacts.type, opts.type));
  }
  const where = and(...conditions);

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(schema.artifacts)
      .where(where)
      .orderBy(desc(schema.artifacts.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.artifacts).where(where),
  ]);

  return { data: items, total: countResult[0]?.count ?? 0 };
}

export async function listByTask(taskId: string) {
  return db
    .select()
    .from(schema.artifacts)
    .where(eq(schema.artifacts.taskId, taskId))
    .orderBy(desc(schema.artifacts.createdAt));
}

export async function listByWorkstream(workstreamId: string) {
  return db
    .select()
    .from(schema.artifacts)
    .where(eq(schema.artifacts.workstreamId, workstreamId))
    .orderBy(desc(schema.artifacts.createdAt));
}

export async function getArtifactById(id: string) {
  const result = await db
    .select()
    .from(schema.artifacts)
    .where(eq(schema.artifacts.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function deleteArtifact(id: string) {
  await db.delete(schema.artifacts).where(eq(schema.artifacts.id, id));
}
