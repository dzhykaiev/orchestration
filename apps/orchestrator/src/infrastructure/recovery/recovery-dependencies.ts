import { projectRepo, taskRepo } from "@orchestration/db";
import { canProjectTransition as canProjectStatusTransition, type ProjectStatus } from "@orchestration/shared";
import type { RecoveryDependencies } from "../../application/recovery/ports.js";
import { eventBus } from "../../events/index.js";
import { implementationQueue } from "../../shared-resources.js";

export const defaultRecoveryDependencies: RecoveryDependencies = {
  projectRepo,
  taskRepo,
  implementationQueue,
  eventBus,
  canProjectTransition(from: string, to: ProjectStatus) {
    return canProjectStatusTransition(from as ProjectStatus, to);
  },
};
