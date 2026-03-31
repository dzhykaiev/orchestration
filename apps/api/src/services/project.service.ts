import { projectRepo, taskRepo, workstreamRepo } from "@orchestration/db";
import type { CreateProjectInput, UpdateProjectInput } from "@orchestration/shared";
import type { Queue } from "bullmq";

export class ProjectService {
  async list(opts: { limit: number; offset: number; includeArchived: boolean }) {
    return projectRepo.listProjects(opts);
  }

  async getById(id: string) {
    const project = await projectRepo.getProjectById(id);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }

  async create(input: CreateProjectInput) {
    const project = await projectRepo.createProject(input);
    if (!project) {
      throw new BusinessError("Failed to create project");
    }
    return project;
  }

  async update(id: string, input: UpdateProjectInput) {
    const project = await projectRepo.updateProject(id, input);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }

  async plan(id: string, planningQueue: Queue) {
    const project = await this.getById(id);

    // Atomic compare-and-swap: only transition from draft → planning
    const updated = await projectRepo.transitionStatus(id, "draft", "planning");
    if (!updated) {
      throw new BusinessError(
        "Only draft projects can be planned (project may have already started)",
      );
    }

    await planningQueue.add("plan", {
      projectId: id,
      goal: project.goal,
      provider: project.provider || process.env.LLM_PROVIDER || "opencode",
    });

    const workstreams = await workstreamRepo.listWorkstreamsByProject(id);
    return { project: updated, workstreams };
  }

  async stop(id: string, planningQueue: Queue, implementationQueue: Queue) {
    const project = await this.getById(id);

    if (!["planning", "in_progress"].includes(project.status)) {
      throw new BusinessError(`Cannot stop project in "${project.status}" status`);
    }

    // Cancel all queued/running tasks
    await taskRepo.cancelTasksByProject(id);

    // Cancel all active workstreams
    await workstreamRepo.cancelWorkstreamsByProject(id);

    // Clean up BullMQ jobs — remove only this project's jobs from queues
    try {
      const planningJobs = await planningQueue.getJobs(["waiting", "delayed", "prioritized"]);
      for (const job of planningJobs) {
        if (job?.data?.projectId === id) {
          await job.remove();
        }
      }
      const implJobs = await implementationQueue.getJobs(["waiting", "delayed", "prioritized"]);
      for (const job of implJobs) {
        if (job?.data?.projectId === id) {
          await job.remove();
        }
      }
    } catch {
      // non-critical — queue cleanup is best effort
    }

    const updated = await projectRepo.updateProject(id, { status: "cancelled" });
    if (!updated) throw new NotFoundError("Project not found");
    return updated;
  }

  async archive(id: string) {
    const project = await this.getById(id);

    if (["planning", "in_progress"].includes(project.status)) {
      throw new BusinessError("Cannot archive a running project. Stop it first.");
    }

    const updated = await projectRepo.updateProject(id, { status: "archived" });
    if (!updated) throw new NotFoundError("Project not found");
    return updated;
  }

  async delete(id: string) {
    const project = await this.getById(id);

    if (!["archived", "completed", "failed", "cancelled"].includes(project.status)) {
      throw new BusinessError(
        "Only archived, completed, failed, or cancelled projects can be deleted",
      );
    }

    await projectRepo.deleteProject(id);
  }

  async getDetail(id: string) {
    const project = await this.getById(id);
    const workstreams = await workstreamRepo.listWorkstreamsByProject(id);
    const tasks = await taskRepo.listTasksByProject(id);
    return { project, workstreams, tasks };
  }

  async listWorkstreams(id: string) {
    await this.getById(id); // ensure project exists
    return workstreamRepo.listWorkstreamsByProject(id);
  }
}

export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class BusinessError extends Error {
  statusCode = 400;
  constructor(message: string) {
    super(message);
    this.name = "BusinessError";
  }
}

export const projectService = new ProjectService();
