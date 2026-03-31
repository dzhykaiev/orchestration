import {
  auditLogRepo,
  featureRepo,
  projectRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import { PROJECT_TRANSITIONS, assertTransition } from "@orchestration/shared";
import type { CreateProjectInput, UpdateProjectInput } from "@orchestration/shared";
import { resolveProvider } from "@orchestration/shared";
import type { Queue } from "bullmq";

export class ProjectService {
  async list(opts: {
    limit: number;
    offset: number;
    includeArchived: boolean;
    status?: string;
    provider?: string;
    workspaceId?: string;
  }) {
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
      provider: resolveProvider(project.provider),
    });

    try {
      await auditLogRepo.createAuditLog({
        projectId: id,
        entityType: "project",
        entityId: id,
        action: "status_changed",
        actorType: "user",
        metadata: { from: "draft", to: "planning" },
      });
    } catch (err) {
      console.warn("[ProjectService] Failed to create audit log for plan:", err);
    }

    const workstreams = await workstreamRepo.listWorkstreamsByProject(id);
    return { project: updated, workstreams };
  }

  async stop(
    id: string,
    planningQueue: Queue,
    implementationQueue: Queue,
    validationQueue?: Queue,
  ) {
    const project = await this.getById(id);

    assertTransition(PROJECT_TRANSITIONS, project.status, "cancelled", "project");

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
      if (validationQueue) {
        const valJobs = await validationQueue.getJobs(["waiting", "delayed", "prioritized"]);
        for (const job of valJobs) {
          if (job?.data?.projectId === id) {
            await job.remove();
          }
        }
      }
    } catch {
      // non-critical — queue cleanup is best effort
    }

    const updated = await projectRepo.updateProject(id, { status: "cancelled" });
    if (!updated) throw new NotFoundError("Project not found");

    try {
      await auditLogRepo.createAuditLog({
        projectId: id,
        entityType: "project",
        entityId: id,
        action: "status_changed",
        actorType: "user",
        metadata: { from: project.status, to: "cancelled" },
      });
    } catch (err) {
      console.warn("[ProjectService] Failed to create audit log for stop:", err);
    }

    return updated;
  }

  async archive(id: string) {
    const project = await this.getById(id);

    assertTransition(PROJECT_TRANSITIONS, project.status, "archived", "project");

    const updated = await projectRepo.updateProject(id, { status: "archived" });
    if (!updated) throw new NotFoundError("Project not found");

    try {
      await auditLogRepo.createAuditLog({
        projectId: id,
        entityType: "project",
        entityId: id,
        action: "status_changed",
        actorType: "user",
        metadata: { from: project.status, to: "archived" },
      });
    } catch (err) {
      console.warn("[ProjectService] Failed to create audit log for archive:", err);
    }

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
    const [workstreams, tasks, feature] = await Promise.all([
      workstreamRepo.listWorkstreamsByProject(id),
      taskRepo.listTasksByProject(id),
      featureRepo.getFeatureByProjectId(id),
    ]);
    return { project, workstreams, tasks, feature };
  }

  async getCostBreakdown(id: string) {
    await this.getById(id); // ensure project exists
    return projectRepo.getCostBreakdown(id);
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
