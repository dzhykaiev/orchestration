import * as db from "@orchestration/db";
import { FEATURE_TRANSITIONS, assertTransition, resolveProvider } from "@orchestration/shared";
import type { FeatureStatus } from "@orchestration/shared";
import type { FeaturesDependencies } from "../../application/features/ports.js";

function assertFeatureTransition(from: FeatureStatus, to: FeatureStatus) {
  assertTransition(FEATURE_TRANSITIONS, from, to, "feature");
}

export function getDefaultFeaturesDependencies(): FeaturesDependencies {
  const auditLogRepo =
    "auditLogRepo" in db
      ? db.auditLogRepo
      : {
          createAuditLog: async () => null,
        };

  return {
    featureRepo: db.featureRepo,
    projectRepo: db.projectRepo,
    auditLogRepo,
    resolveProvider,
    assertFeatureTransition,
  };
}
