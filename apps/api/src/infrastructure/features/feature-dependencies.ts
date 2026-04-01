import * as db from "@orchestration/db";
import { assertFeatureTransition, resolveProvider } from "@orchestration/shared";
import type { FeaturesDependencies } from "../../application/features/ports.js";

export function getDefaultFeaturesDependencies(): FeaturesDependencies {
  const featureRepo =
    "featureRepo" in db
      ? db.featureRepo
      : {
          listFeatures: async () => ({ data: [], total: 0 }),
          getFeatureById: async () => null,
          createFeature: async () => {
            throw new Error("featureRepo is not available");
          },
          updateFeature: async () => null,
          deleteFeature: async () => undefined,
          reorderFeatures: async () => undefined,
        };

  const projectRepo =
    "projectRepo" in db
      ? db.projectRepo
      : {
          createProject: async () => {
            throw new Error("projectRepo is not available");
          },
          deleteProject: async () => undefined,
        };

  const agentDefinitionRepo =
    "agentDefinitionRepo" in db
      ? db.agentDefinitionRepo
      : {
          getById: async () => null,
        };

  const auditLogRepo =
    "auditLogRepo" in db
      ? db.auditLogRepo
      : {
          createAuditLog: async () => null,
        };

  return {
    featureRepo,
    agentDefinitionRepo,
    projectRepo,
    auditLogRepo,
    resolveProvider,
    assertFeatureTransition,
  };
}
