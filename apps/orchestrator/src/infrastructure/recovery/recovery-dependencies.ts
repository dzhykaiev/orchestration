import { projectRepo, taskRepo } from "@orchestration/db";
import { PROJECT_TRANSITIONS, type ProjectStatus, canTransition } from "@orchestration/shared";
import type { RecoveryDependencies } from "../../application/recovery/ports.js";
import { eventBus } from "../../events/index.js";
import { implementationQueue } from "../../shared-resources.js";

export const defaultRecoveryDependencies: RecoveryDependencies = {
  projectRepo,
  taskRepo,
  implementationQueue,
  eventBus,
  canProjectTransition(from: string, to: ProjectStatus) {
    return canTransition(PROJECT_TRANSITIONS, from as ProjectStatus, to);
  },
};
