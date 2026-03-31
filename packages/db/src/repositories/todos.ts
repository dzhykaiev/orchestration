import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "../client.js";

export async function listTodos(opts: {
  workspaceId?: string;
  status?: string;
  limit: number;
  offset: number;
}) {
  const conditions = [];
  if (opts.workspaceId) {
    conditions.push(eq(schema.todos.workspaceId, opts.workspaceId));
  }
  if (opts.status) {
    conditions.push(
      eq(schema.todos.status, opts.status as typeof schema.todos.$inferSelect.status),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const items = await db
    .select()
    .from(schema.todos)
    .where(where)
    .orderBy(asc(schema.todos.order), asc(schema.todos.createdAt))
    .limit(opts.limit)
    .offset(opts.offset);

  return items;
}

export async function getTodoById(id: string) {
  const result = await db.select().from(schema.todos).where(eq(schema.todos.id, id)).limit(1);

  return result[0] ?? null;
}

export async function createTodo(input: {
  workspaceId: string;
  title: string;
  description?: string;
  status?: string;
  order?: number;
}) {
  const [todo] = await db
    .insert(schema.todos)
    .values({
      workspaceId: input.workspaceId,
      title: input.title,
      description: input.description,
      status: (input.status as typeof schema.todos.$inferInsert.status) ?? "pending",
      order: input.order ?? 0,
    })
    .returning();

  // biome-ignore lint/style/noNonNullAssertion: insert always returns a row
  return todo!;
}

export async function updateTodo(
  id: string,
  input: {
    title?: string;
    description?: string;
    status?: string;
    order?: number;
  },
) {
  const [todo] = await db
    .update(schema.todos)
    .set({
      ...input,
      status: input.status as typeof schema.todos.$inferSelect.status | undefined,
      updatedAt: new Date(),
    })
    .where(eq(schema.todos.id, id))
    .returning();

  return todo ?? null;
}

export async function deleteTodo(id: string) {
  await db.delete(schema.todos).where(eq(schema.todos.id, id));
}
