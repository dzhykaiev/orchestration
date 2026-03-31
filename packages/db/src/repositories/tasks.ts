import type { AgentTaskStatus, CreateAgentTaskInput } from "@orchestration/shared";
import { and, asc, eq, lt, sql } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function listTasksByWorkstream(workstreamId: string) {
  return db
    .select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.workstreamId, workstreamId))
    .orderBy(asc(schema.agentTasks.createdAt));
}

export async function listTasksByProject(projectId: string) {
  return db
    .select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.projectId, projectId))
    .orderBy(asc(schema.agentTasks.createdAt));
}

export async function getTaskById(id: string) {
  const result = await db
    .select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function createTask(input: CreateAgentTaskInput) {
  let depth = 0;
  let rootTaskId: string | undefined;

  if (input.parentTaskId) {
    const parent = await getTaskById(input.parentTaskId);
    if (parent) {
      depth = (parent.depth ?? 0) + 1;
      rootTaskId = parent.rootTaskId ?? parent.id;
    }
  }

  const [task] = await db
    .insert(schema.agentTasks)
    .values({
      workstreamId: input.workstreamId,
      projectId: input.projectId,
      role: input.role,
      tier: input.tier,
      parentTaskId: input.parentTaskId,
      rootTaskId,
      depth,
      prompt: input.prompt,
      maxAttempts: input.maxAttempts ?? 3,
    })
    .returning();

  return task ?? null;
}

export async function listChildTasks(parentTaskId: string) {
  return db
    .select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.parentTaskId, parentTaskId))
    .orderBy(asc(schema.agentTasks.createdAt));
}

export async function getTaskTree(rootTaskId: string) {
  return db
    .select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.rootTaskId, rootTaskId))
    .orderBy(asc(schema.agentTasks.depth), asc(schema.agentTasks.createdAt));
}

export async function markTaskStarted(id: string) {
  const [task] = await db
    .update(schema.agentTasks)
    .set({
      status: "running",
      startedAt: new Date(),
      attempts: sql`${schema.agentTasks.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.agentTasks.id, id), eq(schema.agentTasks.status, "queued")))
    .returning();

  if (!task) {
    throw new Error(`Task ${id} cannot be started (not in queued state or does not exist)`);
  }
  return task;
}

export async function markTaskCompleted(
  id: string,
  output: string,
  filesModified: string[],
  costUsd?: number,
) {
  const [task] = await db
    .update(schema.agentTasks)
    .set({
      status: "completed",
      output,
      filesModified,
      costUsd: costUsd?.toString() ?? "0",
      completedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(schema.agentTasks.id, id))
    .returning();

  return task ?? null;
}

export async function markTaskFailed(id: string, error: string) {
  const [task] = await db
    .update(schema.agentTasks)
    .set({
      status: "failed",
      error,
      updatedAt: new Date(),
    })
    .where(eq(schema.agentTasks.id, id))
    .returning();

  return task ?? null;
}

export async function cancelTasksByProject(projectId: string) {
  return db
    .update(schema.agentTasks)
    .set({
      status: "cancelled",
      error: "Project stopped by user",
      updatedAt: new Date(),
    })
    .where(eq(schema.agentTasks.projectId, projectId))
    .returning();
}

export async function retryTask(id: string) {
  // Only allow retry from "failed" state
  const [task] = await db
    .update(schema.agentTasks)
    .set({
      status: "queued",
      error: null,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.agentTasks.id, id), eq(schema.agentTasks.status, "failed")))
    .returning();

  if (!task) {
    throw new Error(`Task ${id} cannot be retried (not in failed state or does not exist)`);
  }
  return task;
}

export async function deleteTasksByProject(projectId: string) {
  return db.delete(schema.agentTasks).where(eq(schema.agentTasks.projectId, projectId));
}

export async function findStaleTasks(status: AgentTaskStatus, olderThanMinutes: number) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  // Use the most relevant timestamp per status
  const timeColumn =
    status === "running"
      ? schema.agentTasks.startedAt
      : status === "queued"
        ? schema.agentTasks.createdAt
        : schema.agentTasks.updatedAt;

  return db
    .select()
    .from(schema.agentTasks)
    .where(and(eq(schema.agentTasks.status, status), lt(timeColumn, cutoff)));
}

export async function countTasksByWorkstream(workstreamId: string) {
  const rows = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${schema.agentTasks.status} = 'completed')::int`,
      failed: sql<number>`count(*) filter (where ${schema.agentTasks.status} = 'failed')::int`,
    })
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.workstreamId, workstreamId));

  return rows[0] ?? { total: 0, completed: 0, failed: 0 };
}
