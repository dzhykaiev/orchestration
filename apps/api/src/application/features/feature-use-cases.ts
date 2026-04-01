import type {
  CreateFeatureInput,
  FeatureAssigneeMode,
  UpdateFeatureInput,
} from "@orchestration/shared";
import { BusinessError, NotFoundError } from "../../domain/common/errors.js";
import { resolveCompanyProjectRoot } from "../../services/runtime/company-paths.js";
import { buildPlanJobPayload } from "../planning/plan-job-payload.js";
import type { FeaturesDependencies, PlanningQueuePort } from "./ports.js";

export class FeatureUseCases {
  constructor(private readonly deps: FeaturesDependencies) {}

  async list(opts: {
    status?: string;
    type?: string;
    workspaceId?: string;
    sourceProjectId?: string;
    assigneeMode?: string;
    assigneeAgentDefinitionId?: string;
    limit: number;
    offset: number;
  }) {
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
    await this.validateAssignee(input.workspaceId, input.assigneeMode, input.assigneeAgentDefinitionId);
    return this.deps.featureRepo.createFeature(input);
  }

  async update(id: string, input: UpdateFeatureInput) {
    const current = await this.getById(id);
    await this.validateAssignee(
      current.workspaceId,
      input.assigneeMode ?? (current.assigneeMode as FeatureAssigneeMode | undefined),
      input.assigneeAgentDefinitionId ?? current.assigneeAgentDefinitionId,
    );

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

    if (!feature.workspaceId) {
      throw new BusinessError("Feature must belong to a workspace before kickoff");
    }

    const initialSandboxRepoPath = resolveCompanyProjectRoot(feature.workspaceId, id);

    const project = await this.deps.projectRepo.createProject({
      name: feature.title,
      goal: feature.description || feature.title,
      workspaceId: feature.workspaceId,
      projectMode: "existing",
      repoPath: initialSandboxRepoPath,
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

      await planningQueue.add(
        "plan",
        buildPlanJobPayload({
          projectId: project.id,
          goal: project.goal,
          projectProvider: project.provider,
          resolveProvider: this.deps.resolveProvider,
        }),
      );
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

  private async validateAssignee(
    workspaceId: string | null | undefined,
    assigneeMode?: FeatureAssigneeMode,
    assigneeAgentDefinitionId?: string | null,
  ) {
    const mode = assigneeMode ?? "orchestrator";

    if (mode === "orchestrator") {
      if (assigneeAgentDefinitionId) {
        throw new BusinessError(
          "assigneeAgentDefinitionId must be empty when assigneeMode is orchestrator",
        );
      }
      return;
    }

    if (!assigneeAgentDefinitionId) {
      throw new BusinessError("assigneeAgentDefinitionId is required when assigneeMode is agent");
    }

    if (!workspaceId) {
      throw new BusinessError("Feature workspace is required for assignee validation");
    }

    const agent = await this.deps.agentDefinitionRepo.getById(assigneeAgentDefinitionId);
    if (!agent) {
      throw new NotFoundError("Assigned agent not found");
    }

    if (agent.workspaceId !== workspaceId) {
      throw new BusinessError("Assigned agent must belong to the same workspace as the feature");
    }
  }
}
