import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "@orchestration/shared";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "../client.js";

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

export async function listWorkspaces(opts: { limit: number; offset: number }) {
  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(schema.workspaces)
      .orderBy(desc(schema.workspaces.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.workspaces),
  ]);

  return { data: items, total: countResult[0]?.count ?? 0 };
}

export async function getWorkspaceById(id: string) {
  const result = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function getWorkspaceBySlug(slug: string) {
  const result = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.slug, slug))
    .limit(1);

  return result[0] ?? null;
}

export async function createWorkspace(input: CreateWorkspaceInput) {
  const slug = input.slug || generateSlug(input.name);

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      name: input.name,
      slug,
      description: input.description,
      mission: input.mission || input.description || input.name,
      bootstrapAgentRole: input.bootstrapAgentRole ?? "ceo",
      bootstrapAgentProvider: input.bootstrapAgentProvider ?? "opencode",
    })
    .returning();

  return workspace ?? null;
}

export async function updateWorkspace(id: string, input: UpdateWorkspaceInput) {
  const [workspace] = await db
    .update(schema.workspaces)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.workspaces.id, id))
    .returning();

  return workspace ?? null;
}

export async function deleteWorkspace(id: string) {
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, id));
}
