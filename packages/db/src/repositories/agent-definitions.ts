import type { CreateAgentDefinitionInput, UpdateAgentDefinitionInput } from "@orchestration/shared";
import { and, eq } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function listByWorkspace(workspaceId: string) {
  return db
    .select()
    .from(schema.agentDefinitions)
    .where(eq(schema.agentDefinitions.workspaceId, workspaceId))
    .orderBy(schema.agentDefinitions.tier);
}

export async function getById(id: string) {
  const result = await db
    .select()
    .from(schema.agentDefinitions)
    .where(eq(schema.agentDefinitions.id, id))
    .limit(1);

  return result[0] ?? null;
}

export async function getByRole(workspaceId: string, role: string) {
  const result = await db
    .select()
    .from(schema.agentDefinitions)
    .where(
      and(
        eq(schema.agentDefinitions.workspaceId, workspaceId),
        eq(schema.agentDefinitions.role, role as typeof schema.agentDefinitions.$inferSelect.role),
      ),
    )
    .limit(1);

  return result[0] ?? null;
}

export async function createAgentDefinition(input: CreateAgentDefinitionInput) {
  const [def] = await db
    .insert(schema.agentDefinitions)
    .values({
      workspaceId: input.workspaceId,
      role: input.role,
      tier: input.tier,
      parentRole: input.parentRole,
      name: input.name,
      systemPrompt: input.systemPrompt,
      capabilities: input.capabilities ?? [],
      maxConcurrentTasks: input.maxConcurrentTasks ?? 1,
      provider: input.provider as typeof schema.agentDefinitions.$inferInsert.provider,
    })
    .returning();

  return def ?? null;
}

export async function updateAgentDefinition(id: string, input: UpdateAgentDefinitionInput) {
  const updateData: Record<string, unknown> = { ...input, updatedAt: new Date() };
  if (input.provider !== undefined) {
    updateData.provider = input.provider as typeof schema.agentDefinitions.$inferInsert.provider;
  }
  const [def] = await db
    .update(schema.agentDefinitions)
    .set(updateData)
    .where(eq(schema.agentDefinitions.id, id))
    .returning();

  return def ?? null;
}

export async function deleteAgentDefinition(id: string) {
  await db.delete(schema.agentDefinitions).where(eq(schema.agentDefinitions.id, id));
}
