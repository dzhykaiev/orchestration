import type { CreateAgentTaskInput } from "@orchestration/shared";

export interface TaskRecord {
  id: string;
  workstreamId: string;
  projectId: string;
  role: string;
  prompt: string;
  status: string;
  [key: string]: unknown;
}

export interface TaskRepositoryPort {
  createTask(input: CreateAgentTaskInput): Promise<TaskRecord | null>;
  getTaskById(id: string): Promise<TaskRecord | null>;
  retryTask(id: string): Promise<TaskRecord | null>;
  markTaskCompleted(
    id: string,
    output: string,
    filesModified: string[],
    costUsd?: number,
  ): Promise<TaskRecord | null>;
  markTaskFailed(id: string, error: string): Promise<TaskRecord | null>;
  listChildTasks(parentTaskId: string): Promise<TaskRecord[]>;
  getTaskTree(rootTaskId: string): Promise<TaskRecord[]>;
}

export interface ProjectRepositoryPort {
  updateTotalCost(projectId: string): Promise<unknown>;
}

export interface ImplementationQueuePort {
  add(name: string, data: unknown): Promise<unknown>;
}

export interface TasksDependencies {
  taskRepo: TaskRepositoryPort;
  projectRepo: ProjectRepositoryPort;
}
