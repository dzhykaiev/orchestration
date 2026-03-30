import { featureRepo, projectRepo } from "@orchestration/db";
import type { CreateFeatureInput, UpdateFeatureInput } from "@orchestration/shared";
import type { Queue } from "bullmq";
import { BusinessError, NotFoundError } from "./project.service.js";

export class FeatureService {
  async list(opts: { status?: string; limit: number; offset: number }) {
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

    if (feature.orchestrationProjectId) {
      throw new BusinessError("Feature already has an orchestration project");
    }

    const selfRepoPath = process.env.SELF_REPO_PATH;
    if (!selfRepoPath) {
      throw new BusinessError("SELF_REPO_PATH is not configured");
    }

    const project = await projectRepo.createProject({
      name: feature.title,
      goal: feature.description || feature.title,
      projectMode: "existing",
      repoPath: selfRepoPath,
    });
    if (!project) {
      throw new Error("Failed to create project for feature");
    }

    await featureRepo.updateFeature(id, {
      status: "in_progress",
      orchestrationProjectId: project.id,
    });

    await planningQueue.add("plan", {
      projectId: project.id,
      goal: project.goal,
      provider: project.provider || process.env.LLM_PROVIDER || "opencode",
    });

    const updatedFeature = await featureRepo.getFeatureById(id);
    return { feature: updatedFeature ?? feature, project };
  }
}

export const featureService = new FeatureService();
