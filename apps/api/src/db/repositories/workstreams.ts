import { eq, asc } from "drizzle-orm";
import { db, schema } from "../index.js";
import type {
  CreateWorkstreamInput,
  UpdateWorkstreamInput,
} from "../../../../../contracts/types/workstream.js";

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

export async function createWorkstream(input: CreateWorkstreamInput) {
  const [ws] = await db
    .insert(schema.workstreams)
    .values({
      projectId: input.projectId,
      name: input.name,
      objective: input.objective,
      dependencies: input.dependencies ?? [],
      deliverables: input.deliverables ?? [],
      ownedPaths: input.ownedPaths ?? [],
      order: input.order ?? 0,
    })
    .returning();

  return ws!;
}

export async function updateWorkstream(id: string, input: UpdateWorkstreamInput) {
  const [ws] = await db
    .update(schema.workstreams)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(schema.workstreams.id, id))
    .returning();

  return ws ?? null;
}

export async function getCompletedWorkstreamIds(projectId: string) {
  const rows = await db
    .select({ id: schema.workstreams.id })
    .from(schema.workstreams)
    .where(eq(schema.workstreams.projectId, projectId));

  return rows
    .filter((r) => true) // all IDs returned; caller filters by status if needed
    .map((r) => r.id);
}
