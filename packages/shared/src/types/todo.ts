export type TodoStatus = "pending" | "in_progress" | "completed";

export interface Todo {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: TodoStatus;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTodoInput {
  workspaceId: string;
  title: string;
  description?: string;
  status?: TodoStatus;
  order?: number;
}

export interface UpdateTodoInput {
  title?: string;
  description?: string;
  status?: TodoStatus;
  order?: number;
}
