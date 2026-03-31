import type { CreateWorkstreamInput, UpdateWorkstreamInput } from "@orchestration/shared";
import { NotFoundError } from "../../domain/common/errors.js";
import type { WorkstreamsDependencies } from "./ports.js";

export class ValidationError extends Error {
  statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export class WorkstreamUseCases {
  constructor(private readonly deps: WorkstreamsDependencies) {}

  async getById(id: string) {
    const workstream = await this.deps.workstreamRepo.getWorkstreamById(id);
    if (!workstream) {
      throw new NotFoundError("Workstream not found");
    }
    return workstream;
  }

  async create(input: CreateWorkstreamInput) {
    const project = await this.deps.projectRepo.getProjectById(input.projectId);
    if (!project) {
      throw new NotFoundError("Project not found");
    }

    if (input.dependencies?.length) {
      const existing = await this.deps.workstreamRepo.listWorkstreamsByProject(input.projectId);
      const existingIds = new Set(existing.map((ws) => ws.id));
      const invalidDeps = input.dependencies.filter((dep) => !existingIds.has(dep));
      if (invalidDeps.length > 0) {
        throw new ValidationError(
          `Invalid dependencies: workstreams not found in project: ${invalidDeps.join(", ")}`,
        );
      }
    }

    const workstream = await this.deps.workstreamRepo.createWorkstream(input);
    if (!workstream) {
      throw new NotFoundError("Failed to create workstream");
    }
    return workstream;
  }

  async update(id: string, input: UpdateWorkstreamInput) {
    const workstream = await this.deps.workstreamRepo.updateWorkstream(id, input);
    if (!workstream) {
      throw new NotFoundError("Workstream not found");
    }
    return workstream;
  }

  async listTasks(workstreamId: string) {
    await this.getById(workstreamId);
    return this.deps.taskRepo.listTasksByWorkstream(workstreamId);
  }
}
