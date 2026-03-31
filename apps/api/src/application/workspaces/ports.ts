import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "@orchestration/shared";

export interface WorkspaceRecord {
  id: string;
  [key: string]: unknown;
}

export interface ListWorkspacesQuery {
  limit: number;
  offset: number;
}

export interface ListProjectsQuery {
  limit: number;
  offset: number;
  includeArchived: boolean;
}

export interface WorkspaceRepositoryPort {
  listWorkspaces(opts: ListWorkspacesQuery): Promise<{ data: WorkspaceRecord[]; total: number }>;
  getWorkspaceById(id: string): Promise<WorkspaceRecord | null>;
  getWorkspaceBySlug(slug: string): Promise<WorkspaceRecord | null>;
  createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceRecord | null>;
  updateWorkspace(id: string, input: UpdateWorkspaceInput): Promise<WorkspaceRecord | null>;
  deleteWorkspace(id: string): Promise<void>;
}

export interface ProjectRepositoryPort {
  listProjects(
    opts: ListProjectsQuery & { workspaceId: string },
  ): Promise<{ data: unknown[]; total: number }>;
}

export interface WorkspacesDependencies {
  workspaceRepo: WorkspaceRepositoryPort;
  projectRepo: ProjectRepositoryPort;
}
