import type { CreateProjectInput, ProjectStatus, UpdateProjectInput } from "@orchestration/shared";
import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db, schema } from "../client.js";
import { getWorkspaceById } from "./workspaces.js";

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
  workspaceId?: string;
  status?: string;
  provider?: string;
}) {
  const conditions = [];
  if (!opts.includeArchived) {
    conditions.push(ne(schema.projects.status, "archived"));
  }
  if (opts.workspaceId) {
    conditions.push(eq(schema.projects.workspaceId, opts.workspaceId));
  }
  if (opts.status) {
    conditions.push(
      eq(schema.projects.status, opts.status as typeof schema.projects.$inferSelect.status),
    );
  }
  if (opts.provider) {
    conditions.push(
      eq(schema.projects.provider, opts.provider as typeof schema.projects.$inferSelect.provider),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(schema.projects)
      .where(where)
      .orderBy(desc(schema.projects.createdAt))
      .limit(opts.limit)
      .offset(opts.offset),
    db.select({ count: sql<number>`count(*)::int` }).from(schema.projects).where(where),
  ]);

  return { data: items, total: countResult[0]?.count ?? 0 };
}

export async function getProjectById(id: string) {
  const result = await db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);

  return result[0] ?? null;
}

export async function createProject(input: CreateProjectInput) {
  const workspace = await getWorkspaceById(input.workspaceId);
  if (!workspace) {
    throw new Error(`Workspace not found: ${input.workspaceId}`);
  }

  const [project] = await db
    .insert(schema.projects)
    .values({
      name: input.name,
      goal: input.goal,
      workspaceId: input.workspaceId,
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

export async function transitionStatus(id: string, from: ProjectStatus, to: ProjectStatus) {
  const [project] = await db
    .update(schema.projects)
    .set({ status: to, updatedAt: new Date() })
    .where(and(eq(schema.projects.id, id), eq(schema.projects.status, from)))
    .returning();
  return project ?? null;
}

export async function getCostBreakdown(projectId: string) {
  const [byWorkstream, byRole, countResult, project] = await Promise.all([
    db
      .select({
        workstreamId: schema.agentTasks.workstreamId,
        name: schema.workstreams.name,
        cost: sql<string>`coalesce(sum(${schema.agentTasks.costUsd}), 0)`,
      })
      .from(schema.agentTasks)
      .innerJoin(schema.workstreams, eq(schema.agentTasks.workstreamId, schema.workstreams.id))
      .where(eq(schema.agentTasks.projectId, projectId))
      .groupBy(schema.agentTasks.workstreamId, schema.workstreams.name),
    db
      .select({
        role: schema.agentTasks.role,
        cost: sql<string>`coalesce(sum(${schema.agentTasks.costUsd}), 0)`,
      })
      .from(schema.agentTasks)
      .where(eq(schema.agentTasks.projectId, projectId))
      .groupBy(schema.agentTasks.role),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(schema.agentTasks)
      .where(eq(schema.agentTasks.projectId, projectId)),
    getProjectById(projectId),
  ]);

  return {
    total: Number(project?.totalCostUsd ?? 0),
    byWorkstream: byWorkstream.map((row) => ({
      workstreamId: row.workstreamId,
      name: row.name,
      cost: Number(row.cost),
    })),
    byRole: byRole.map((row) => ({
      role: row.role,
      cost: Number(row.cost),
    })),
    taskCount: countResult[0]?.count ?? 0,
  };
}

export async function deleteProject(id: string) {
  // Clear feature references before deleting (onDelete: set null handles this via FK,
  // but explicit nulling avoids depending on migration state)
  await db
    .update(schema.features)
    .set({ orchestrationProjectId: null, updatedAt: new Date() })
    .where(eq(schema.features.orchestrationProjectId, id));

  // Cascade deletes handle agent_tasks and workstreams via FK onDelete: cascade
  await db.delete(schema.projects).where(eq(schema.projects.id, id));
}
