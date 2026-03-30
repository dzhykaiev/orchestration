import type { CreateProjectInput, UpdateProjectInput } from "@orchestration/shared";
import { desc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function updateTotalCost(projectId: string) {
  const [result] = await db
    .select({ total: sql<string>`coalesce(sum(${schema.agentTasks.costUsd})::text, '0')` })
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.projectId, projectId));

  const [project] = await db
    .update(schema.projects)
    .set({ totalCostUsd: result?.total ?? "0", updatedAt: new Date() })
    .where(eq(schema.projects.id, projectId))
    .returning();

  return project ?? null;
}

export async function listProjects(opts: {
  limit: number;
  offset: number;
  includeArchived: boolean;
}) {
  const base = db.select().from(schema.projects);
  const countBase = db.select({ count: sql<number>`count(*)::int` }).from(schema.projects);

  if (!opts.includeArchived) {
    const [items, countResult] = await Promise.all([
      base
        .where(ne(schema.projects.status, "archived"))
        .orderBy(desc(schema.projects.createdAt))
        .limit(opts.limit)
        .offset(opts.offset),
      countBase.where(ne(schema.projects.status, "archived")),
    ]);
    return { projects: items, total: countResult[0]?.count ?? 0 };
  }

  const [items, countResult] = await Promise.all([
    base.orderBy(desc(schema.projects.createdAt)).limit(opts.limit).offset(opts.offset),
    countBase,
  ]);

  return { projects: items, total: countResult[0]?.count ?? 0 };
}

export async function getProjectById(id: string) {
  const result = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);

  return result[0] ?? null;
}

export async function createProject(input: CreateProjectInput) {
  const [project] = await db
    .insert(schema.projects)
    .values({
      name: input.name,
      goal: input.goal,
      provider: input.provider || "opencode",
      repoUrl: input.repoUrl,
      repoPath: input.repoPath,
      projectMode: input.projectMode || "greenfield",
    })
    .returning();

  return project ?? null;
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const [project] = await db
    .update(schema.projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.projects.id, id))
    .returning();

  return project ?? null;
}

export async function deleteProject(id: string) {
  await db.delete(schema.agentTasks).where(eq(schema.agentTasks.projectId, id));
  await db.delete(schema.workstreams).where(eq(schema.workstreams.projectId, id));
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
}
