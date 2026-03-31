import type { CreateWorkstreamInput, UpdateWorkstreamInput } from "@orchestration/shared";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "../client.js";

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function createWorkstream(input: CreateWorkstreamInput) {
  if (input.dependencies?.length) {
    for (const dep of input.dependencies) {
      if (!UUID_RE.test(dep)) {
        console.warn(`[WorkstreamRepo] Non-UUID dependency "${dep}" in workstream "${input.name}" — will be normalized later`);
      }
    }
  }

  const [ws] = await db
    .insert(schema.workstreams)
    .values({
      projectId: input.projectId,
      name: input.name,
      objective: input.objective,
      dependencies: input.dependencies ?? [],
      deliverables: input.deliverables ?? [],
      ownedPaths: input.ownedPaths ?? [],
      assignedAgent: input.assignedAgent ?? null,
      order: input.order ?? 0,
    })
    .returning();

  return ws ?? null;
}

export async function updateWorkstream(id: string, input: UpdateWorkstreamInput) {
  const [ws] = await db
    .update(schema.workstreams)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.workstreams.id, id))
    .returning();

  return ws ?? null;
}

export async function cancelWorkstreamsByProject(projectId: string) {
  return db
    .update(schema.workstreams)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(schema.workstreams.projectId, projectId))
    .returning();
}
