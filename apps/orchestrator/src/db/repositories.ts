import { eq, sql, asc } from "drizzle-orm";
import { db, schema } from "@orchestration/db";

// --- Projects ---

export async function getProjectById(id: string) {
  const result = await db
    .select()
    .from(schema.projects)
    .where(eq(schema.projects.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function updateProject(
  id: string,
  data: Partial<{
    status: "draft" | "planning" | "in_progress" | "completed" | "failed";
    architecture: string;
  }>,
) {
  const [project] = await db
    .update(schema.projects)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.projects.id, id))
    .returning();
  return project ?? null;
}

// --- Workstreams ---

export async function listWorkstreamsByProject(projectId: string) {
  return db
    .select()
    .from(schema.workstreams)
    .where(eq(schema.workstreams.projectId, projectId))
    .orderBy(asc(schema.workstreams.order));
}

export async function getWorkstreamById(id: string) {
  const result = await db
    .select()
    .from(schema.workstreams)
    .where(eq(schema.workstreams.id, id))
    .limit(1);
  return result[0] ?? null;
}

export async function createWorkstream(data: {
  projectId: string;
  name: string;
  objective: string;
  dependencies?: string[];
  deliverables?: string[];
  ownedPaths?: string[];
  assignedAgent?: string;
  order?: number;
}) {
  const [ws] = await db
    .insert(schema.workstreams)
    .values({
      projectId: data.projectId,
      name: data.name,
      objective: data.objective,
      dependencies: data.dependencies ?? [],
      deliverables: data.deliverables ?? [],
      ownedPaths: data.ownedPaths ?? [],
      assignedAgent: data.assignedAgent ?? null,
      order: data.order ?? 0,
    })
    .returning();
  return ws!;
}

export async function updateWorkstream(
  id: string,
  data: Partial<{
    status: "pending" | "blocked" | "in_progress" | "completed" | "failed";
    assignedAgent: string | null;
  }>,
) {
  const [ws] = await db
    .update(schema.workstreams)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.workstreams.id, id))
    .returning();
  return ws ?? null;
}

// --- Tasks ---

export async function createTask(data: {
  workstreamId: string;
  projectId: string;
  role: "architect" | "backend" | "frontend" | "data" | "devops" | "qa";
  prompt: string;
  maxAttempts?: number;
}) {
  const [task] = await db
    .insert(schema.agentTasks)
    .values({
      workstreamId: data.workstreamId,
      projectId: data.projectId,
      role: data.role,
      prompt: data.prompt,
      maxAttempts: data.maxAttempts ?? 3,
    })
    .returning();
  return task!;
}

export async function getTaskById(id: string) {
  const result = await db
    .select()
    .from(schema.agentTasks)
    .where(eq(schema.agentTasks.id, id))
    .limit(1);
  return result[0] ?? null;
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
    .where(eq(schema.agentTasks.id, id))
    .returning();
  return task ?? null;
}

export async function markTaskCompleted(
  id: string,
  output: string,
  filesModified: string[],
) {
  const [task] = await db
    .update(schema.agentTasks)
    .set({
      status: "completed",
      output,
      filesModified,
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
    .set({ status: "failed", error, updatedAt: new Date() })
    .where(eq(schema.agentTasks.id, id))
    .returning();
  return task ?? null;
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
