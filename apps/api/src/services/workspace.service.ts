import { projectRepo, workspaceRepo } from "@orchestration/db";
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "@orchestration/shared";
import { BusinessError, NotFoundError } from "./project.service.js";

export class WorkspaceService {
  async list(opts: { limit: number; offset: number }) {
    return workspaceRepo.listWorkspaces(opts);
  }

  async getById(id: string) {
    const workspace = await workspaceRepo.getWorkspaceById(id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }
    return workspace;
  }

  async getBySlug(slug: string) {
    const workspace = await workspaceRepo.getWorkspaceBySlug(slug);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }
    return workspace;
  }

  async create(input: CreateWorkspaceInput) {
    if (input.slug) {
      const existing = await workspaceRepo.getWorkspaceBySlug(input.slug);
      if (existing) {
        throw new BusinessError("Workspace with this slug already exists");
      }
    }

    const workspace = await workspaceRepo.createWorkspace(input);
    if (!workspace) {
      throw new BusinessError("Failed to create workspace");
    }
    return workspace;
  }

  async update(id: string, input: UpdateWorkspaceInput) {
    await this.getById(id);

    if (input.slug) {
      const existing = await workspaceRepo.getWorkspaceBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new BusinessError("Workspace with this slug already exists");
      }
    }

    const workspace = await workspaceRepo.updateWorkspace(id, input);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }
    return workspace;
  }

  async delete(id: string) {
    await this.getById(id);
    await workspaceRepo.deleteWorkspace(id);
  }

  async listProjects(
    id: string,
    opts: { limit: number; offset: number; includeArchived: boolean },
  ) {
    await this.getById(id);
    return projectRepo.listProjects({ ...opts, workspaceId: id });
  }
}

export const workspaceService = new WorkspaceService();
