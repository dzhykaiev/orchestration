import type { CreateFeatureInput, UpdateFeatureInput } from "@orchestration/shared";
import { BusinessError, NotFoundError } from "../../domain/common/errors.js";
import type { FeaturesDependencies, PlanningQueuePort } from "./ports.js";

export class FeatureUseCases {
  constructor(private readonly deps: FeaturesDependencies) {}

  async list(opts: { status?: string; workspaceId?: string; limit: number; offset: number }) {
    return this.deps.featureRepo.listFeatures(opts);
  }

  async getById(id: string) {
    const feature = await this.deps.featureRepo.getFeatureById(id);
    if (!feature) {
      throw new NotFoundError("Feature not found");
    }
    return feature;
  }

  async create(input: CreateFeatureInput) {
    return this.deps.featureRepo.createFeature(input);
  }

  async update(id: string, input: UpdateFeatureInput) {
    const feature = await this.deps.featureRepo.updateFeature(id, input);
    if (!feature) {
      throw new NotFoundError("Feature not found");
    }
    return feature;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.deps.featureRepo.deleteFeature(id);
  }

  async reorder(updates: { id: string; sortOrder: number }[]) {
    await this.deps.featureRepo.reorderFeatures(updates);
  }

  async kickoff(id: string, planningQueue: PlanningQueuePort) {
    const feature = await this.getById(id);
    this.deps.assertFeatureTransition(feature.status, "in_progress");

    if (feature.orchestrationProjectId) {
      throw new BusinessError("Feature already has an orchestration project");
    }

    const selfRepoPath = process.env.SELF_REPO_PATH;
    if (!selfRepoPath) {
      throw new BusinessError("SELF_REPO_PATH is not configured");
    }

    if (!feature.workspaceId) {
      throw new BusinessError("Feature must belong to a workspace before kickoff");
    }

    const project = await this.deps.projectRepo.createProject({
      name: feature.title,
      goal: feature.description || feature.title,
      workspaceId: feature.workspaceId,
      projectMode: "existing",
      repoPath: selfRepoPath,
    });
    if (!project) {
      throw new Error("Failed to create project for feature");
    }

    let featureUpdated = false;
    try {
      await this.deps.featureRepo.updateFeature(id, {
        status: "in_progress",
        orchestrationProjectId: project.id,
      });
      featureUpdated = true;

      await planningQueue.add("plan", {
        projectId: project.id,
        goal: project.goal,
        provider: this.deps.resolveProvider(project.provider),
      });
    } catch (err) {
      try {
        if (featureUpdated) {
          await this.deps.featureRepo.updateFeature(id, {
            status: feature.status,
          });
        }
        await this.deps.projectRepo.deleteProject(project.id);
      } catch (rollbackErr) {
        console.error("[FeatureUseCases] Kickoff rollback failed:", rollbackErr);
      }
      throw new BusinessError(
        `Failed to kickoff feature orchestration: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      await this.deps.auditLogRepo.createAuditLog({
        projectId: project.id,
        entityType: "feature",
        entityId: id,
        action: "status_changed",
        actorType: "user",
        metadata: { from: feature.status, to: "in_progress" },
      });
    } catch (err) {
      console.warn("[FeatureUseCases] Failed to create audit log for kickoff:", err);
    }

    const updatedFeature = await this.deps.featureRepo.getFeatureById(id);
    return { feature: updatedFeature ?? feature, project };
  }
}
