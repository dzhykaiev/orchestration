import * as db from "@orchestration/db";
import { FEATURE_TRANSITIONS, assertTransition, resolveProvider } from "@orchestration/shared";
import type { FeatureStatus } from "@orchestration/shared";
import type { FeaturesDependencies } from "../../application/features/ports.js";

function assertFeatureTransition(from: FeatureStatus, to: FeatureStatus) {
  assertTransition(FEATURE_TRANSITIONS, from, to, "feature");
}

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

  const auditLogRepo =
    "auditLogRepo" in db
      ? db.auditLogRepo
      : {
          createAuditLog: async () => null,
        };

  return {
    featureRepo,
    projectRepo,
    auditLogRepo,
    resolveProvider,
    assertFeatureTransition,
  };
}
