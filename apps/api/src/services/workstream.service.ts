import { projectRepo, taskRepo, workstreamRepo } from "@orchestration/db";
import type { CreateWorkstreamInput, UpdateWorkstreamInput } from "@orchestration/shared";
import { NotFoundError } from "./project.service.js";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class WorkstreamService {
  async getById(id: string) {
    const workstream = await workstreamRepo.getWorkstreamById(id);
    if (!workstream) {
      throw new NotFoundError("Workstream not found");
    }
    return workstream;
  }

  async create(input: CreateWorkstreamInput) {
    // Ensure the parent project exists
    const project = await projectRepo.getProjectById(input.projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    // Validate that all dependency UUIDs exist as workstreams in the same project
    if (input.dependencies?.length) {
      const existingWorkstreams = await workstreamRepo.listWorkstreamsByProject(input.projectId);
      const existingIds = new Set(existingWorkstreams.map((ws) => ws.id));

      const invalidDeps = input.dependencies.filter((dep) => !existingIds.has(dep));
      if (invalidDeps.length > 0) {
        throw new ValidationError(
          `Invalid dependencies: workstreams not found in project: ${invalidDeps.join(", ")}`,
        );
      }
    }

    const workstream = await workstreamRepo.createWorkstream(input);
    if (!workstream) {
      throw new NotFoundError("Failed to create workstream");
    }
    return workstream;
  }

  async update(id: string, input: UpdateWorkstreamInput) {
    const workstream = await workstreamRepo.updateWorkstream(id, input);
    if (!workstream) {
      throw new NotFoundError("Workstream not found");
    }
    return workstream;
  }

  async listTasks(workstreamId: string) {
    await this.getById(workstreamId); // ensure workstream exists
    return taskRepo.listTasksByWorkstream(workstreamId);
  }
}

export const workstreamService = new WorkstreamService();
