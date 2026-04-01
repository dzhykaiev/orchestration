import type { CreateProjectInput, UpdateProjectInput } from "@orchestration/shared";
import { BusinessError, NotFoundError } from "../../domain/common/errors.js";
import { buildPlanJobPayload } from "../planning/plan-job-payload.js";
import type { ProjectQueuePort, ProjectsDependencies } from "./ports.js";

export class ProjectUseCases {
  constructor(private readonly deps: ProjectsDependencies) {}

  async list(opts: {
    limit: number;
    offset: number;
    includeArchived: boolean;
    status?: string;
    provider?: string;
    workspaceId?: string;
  }) {
    return this.deps.projectRepo.listProjects(opts);
  }

  async getById(id: string) {
    const project = await this.deps.projectRepo.getProjectById(id);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }

  async create(input: CreateProjectInput) {
    const project = await this.deps.projectRepo.createProject(input);
    if (!project) {
      throw new BusinessError("Failed to create project");
    }
    return project;
  }

  async update(id: string, input: UpdateProjectInput) {
    const project = await this.deps.projectRepo.updateProject(id, input);
    if (!project) {
      throw new NotFoundError("Project not found");
    }
    return project;
  }

  async plan(id: string, planningQueue: ProjectQueuePort) {
    const project = await this.getById(id);

    const updated = await this.deps.projectRepo.transitionStatus(id, "draft", "planning");
    if (!updated) {
      throw new BusinessError(
        "Only draft projects can be planned (project may have already started)",
      );
    }

    await planningQueue.add(
      "plan",
      buildPlanJobPayload({
        projectId: id,
        goal: project.goal,
        projectProvider: project.provider,
        resolveProvider: this.deps.resolveProvider,
      }),
    );

    try {
      await this.deps.auditLogRepo.createAuditLog({
        projectId: id,
        entityType: "project",
        entityId: id,
        action: "status_changed",
        actorType: "user",
        metadata: { from: "draft", to: "planning" },
      });
    } catch (err) {
      console.warn("[ProjectUseCases] Failed to create audit log for plan:", err);
    }

    const workstreams = await this.deps.workstreamRepo.listWorkstreamsByProject(id);
    return { project: updated, workstreams };
  }

  async stop(
    id: string,
    planningQueue: ProjectQueuePort,
    implementationQueue: ProjectQueuePort,
    validationQueue?: ProjectQueuePort,
  ) {
    const project = await this.getById(id);
    this.deps.assertProjectTransition(project.status, "cancelled");

    await this.deps.taskRepo.cancelTasksByProject(id);
    await this.deps.workstreamRepo.cancelWorkstreamsByProject(id);

    try {
      await this.removeProjectJobs(planningQueue, id);
      await this.removeProjectJobs(implementationQueue, id);
      if (validationQueue) {
        await this.removeProjectJobs(validationQueue, id);
      }
    } catch {
      // Best-effort queue cleanup.
    }

    const updated = await this.deps.projectRepo.updateProject(id, { status: "cancelled" });
    if (!updated) {
      throw new NotFoundError("Project not found");
    }

    try {
      await this.deps.auditLogRepo.createAuditLog({
        projectId: id,
        entityType: "project",
        entityId: id,
        action: "status_changed",
        actorType: "user",
        metadata: { from: project.status, to: "cancelled" },
      });
    } catch (err) {
      console.warn("[ProjectUseCases] Failed to create audit log for stop:", err);
    }

    return updated;
  }

  async archive(id: string) {
    const project = await this.getById(id);
    this.deps.assertProjectTransition(project.status, "archived");

    const updated = await this.deps.projectRepo.updateProject(id, { status: "archived" });
    if (!updated) {
      throw new NotFoundError("Project not found");
    }

    try {
      await this.deps.auditLogRepo.createAuditLog({
        projectId: id,
        entityType: "project",
        entityId: id,
        action: "status_changed",
        actorType: "user",
        metadata: { from: project.status, to: "archived" },
      });
    } catch (err) {
      console.warn("[ProjectUseCases] Failed to create audit log for archive:", err);
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
    await this.deps.projectRepo.deleteProject(id);
  }

  async getDetail(id: string) {
    const project = await this.getById(id);
    const [workstreams, tasks, feature] = await Promise.all([
      this.deps.workstreamRepo.listWorkstreamsByProject(id),
      this.deps.taskRepo.listTasksByProject(id),
      this.deps.featureRepo.getFeatureByProjectId(id),
    ]);
    return { project, workstreams, tasks, feature };
  }

  async getCostBreakdown(id: string) {
    await this.getById(id);
    return this.deps.projectRepo.getCostBreakdown(id);
  }

  async listWorkstreams(id: string) {
    await this.getById(id);
    return this.deps.workstreamRepo.listWorkstreamsByProject(id);
  }

  async listIssues(
    id: string,
    opts: {
      status?: string;
      limit: number;
      offset: number;
    },
  ) {
    await this.getById(id);
    return this.deps.featureRepo.listFeatures({
      ...opts,
      type: "bug",
      sourceProjectId: id,
    });
  }

  private async removeProjectJobs(queue: ProjectQueuePort, projectId: string) {
    const jobs = await queue.getJobs(["waiting", "delayed", "prioritized"]);
    for (const job of jobs) {
      if (job.data?.projectId === projectId) {
        await job.remove();
      }
    }
  }
}
