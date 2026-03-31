import type { CreateWorkstreamInput, UpdateWorkstreamInput } from "@orchestration/shared";

export interface ProjectLookupPort {
  getProjectById(id: string): Promise<{ id: string } | null>;
}

export interface WorkstreamRecord {
  id: string;
  [key: string]: unknown;
}

export interface TaskRecord {
  id: string;
  [key: string]: unknown;
}

export interface WorkstreamRepositoryPort {
  getWorkstreamById(id: string): Promise<WorkstreamRecord | null>;
  listWorkstreamsByProject(projectId: string): Promise<WorkstreamRecord[]>;
  createWorkstream(input: CreateWorkstreamInput): Promise<WorkstreamRecord | null>;
  updateWorkstream(id: string, input: UpdateWorkstreamInput): Promise<WorkstreamRecord | null>;
}

export interface TaskRepositoryPort {
  listTasksByWorkstream(workstreamId: string): Promise<TaskRecord[]>;
}

export interface WorkstreamsDependencies {
  projectRepo: ProjectLookupPort;
  workstreamRepo: WorkstreamRepositoryPort;
  taskRepo: TaskRepositoryPort;
}
