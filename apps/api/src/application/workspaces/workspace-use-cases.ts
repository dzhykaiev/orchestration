import type { CreateWorkspaceInput, UpdateWorkspaceInput } from "@orchestration/shared";
import { BusinessError, NotFoundError } from "../../domain/common/errors.js";
import type { WorkspacesDependencies } from "./ports.js";

export class WorkspaceUseCases {
  constructor(private readonly deps: WorkspacesDependencies) {}

  async list(opts: { limit: number; offset: number }) {
    return this.deps.workspaceRepo.listWorkspaces(opts);
  }

  async getById(id: string) {
    const workspace = await this.deps.workspaceRepo.getWorkspaceById(id);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }
    return workspace;
  }

  async getBySlug(slug: string) {
    const workspace = await this.deps.workspaceRepo.getWorkspaceBySlug(slug);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }
    return workspace;
  }

  async create(input: CreateWorkspaceInput) {
    if (input.slug) {
      const existing = await this.deps.workspaceRepo.getWorkspaceBySlug(input.slug);
      if (existing) {
        throw new BusinessError("Workspace with this slug already exists");
      }
    }

    const workspace = await this.deps.workspaceRepo.createWorkspace(input);
    if (!workspace) {
      throw new BusinessError("Failed to create workspace");
    }
    return workspace;
  }

  async update(id: string, input: UpdateWorkspaceInput) {
    await this.getById(id);

    if (input.slug) {
      const existing = await this.deps.workspaceRepo.getWorkspaceBySlug(input.slug);
      if (existing && existing.id !== id) {
        throw new BusinessError("Workspace with this slug already exists");
      }
    }

    const workspace = await this.deps.workspaceRepo.updateWorkspace(id, input);
    if (!workspace) {
      throw new NotFoundError("Workspace not found");
    }
    return workspace;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.deps.workspaceRepo.deleteWorkspace(id);
  }

  async listProjects(
    id: string,
    opts: { limit: number; offset: number; includeArchived: boolean },
  ) {
    await this.getById(id);
    return this.deps.projectRepo.listProjects({ ...opts, workspaceId: id });
  }
}
