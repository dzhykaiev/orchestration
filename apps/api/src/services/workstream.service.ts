import { workstreamRepo, taskRepo, projectRepo } from "@orchestration/db";
import type { CreateWorkstreamInput, UpdateWorkstreamInput } from "@orchestration/shared";
import { NotFoundError } from "./project.service.js";

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

    return workstreamRepo.createWorkstream(input);
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
