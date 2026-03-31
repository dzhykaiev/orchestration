import { auditLogRepo, featureRepo, projectRepo } from "@orchestration/db";
import { FEATURE_TRANSITIONS, assertTransition } from "@orchestration/shared";
import type { CreateFeatureInput, UpdateFeatureInput } from "@orchestration/shared";
import { resolveProvider } from "@orchestration/shared";
import type { Queue } from "bullmq";
import { BusinessError, NotFoundError } from "./project.service.js";

export class FeatureService {
  async list(opts: { status?: string; workspaceId?: string; limit: number; offset: number }) {
    return featureRepo.listFeatures(opts);
  }

  async getById(id: string) {
    const feature = await featureRepo.getFeatureById(id);
    if (!feature) {
      throw new NotFoundError("Feature not found");
    }
    return feature;
  }

  async create(input: CreateFeatureInput) {
    return featureRepo.createFeature(input);
  }

  async update(id: string, input: UpdateFeatureInput) {
    const feature = await featureRepo.updateFeature(id, input);
    if (!feature) {
      throw new NotFoundError("Feature not found");
    }
    return feature;
  }

  async delete(id: string) {
    await this.getById(id);
    await featureRepo.deleteFeature(id);
  }

  async reorder(updates: { id: string; sortOrder: number }[]) {
    await featureRepo.reorderFeatures(updates);
  }

  async kickoff(id: string, planningQueue: Queue) {
    const feature = await this.getById(id);

    // Validate feature can transition to in_progress
    assertTransition(FEATURE_TRANSITIONS, feature.status, "in_progress", "feature");

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

    const project = await projectRepo.createProject({
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
      await featureRepo.updateFeature(id, {
        status: "in_progress",
        orchestrationProjectId: project.id,
      });
      featureUpdated = true;

      await planningQueue.add("plan", {
        projectId: project.id,
        goal: project.goal,
        provider: resolveProvider(project.provider),
      });
    } catch (err) {
      // Compensation: revert feature link/status and remove project if queue enqueue failed.
      try {
        if (featureUpdated) {
          await featureRepo.updateFeature(id, {
            status: feature.status,
          });
        }
        await projectRepo.deleteProject(project.id);
      } catch (rollbackErr) {
        console.error("[FeatureService] Kickoff rollback failed:", rollbackErr);
      }
      throw new BusinessError(
        `Failed to kickoff feature orchestration: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    try {
      await auditLogRepo.createAuditLog({
        projectId: project.id,
        entityType: "feature",
        entityId: id,
        action: "status_changed",
        actorType: "user",
        metadata: { from: feature.status, to: "in_progress" },
      });
    } catch (err) {
      console.warn("[FeatureService] Failed to create audit log for kickoff:", err);
    }

    const updatedFeature = await featureRepo.getFeatureById(id);
    return { feature: updatedFeature ?? feature, project };
  }
}

export const featureService = new FeatureService();
