import { eq, sql, desc } from "drizzle-orm";
import { db, schema } from "../index.js";
import type { CreateProjectInput, UpdateProjectInput } from "../../../../../contracts/types/project.js";

export async function listProjects(opts: { limit: number; offset: number }) {
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .orderBy(desc(schema.projects.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.projects),
  ]);

  return { projects: items, total: countResult[0]?.count ?? 0 };
}

export async function getProjectById(id: string) {
  const result = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function createProject(input: CreateProjectInput) {
  const [project] = await db
    .insert(schema.projects)
    .values({ name: input.name, goal: input.goal })
    .returning();

  return project!;
}

export async function updateProject(id: string, input: UpdateProjectInput) {
  const [project] = await db
    .update(schema.projects)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.projects.id, id))
    .returning();

  return project ?? null;
}
