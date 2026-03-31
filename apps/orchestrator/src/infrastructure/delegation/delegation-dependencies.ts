import { taskRepo } from "@orchestration/db";
import type { DelegationDependencies } from "../../application/delegation/ports.js";
import { eventBus } from "../../events/index.js";
import { implementationQueue } from "../../shared-resources.js";

const VALID_ROLES: Set<string> = new Set([
  "backend",
  "frontend",
  "data",
  "devops",
  "qa",
  "reviewer",
]);

const MAX_DELEGATION_DEPTH = 3;

export const defaultDelegationDependencies: DelegationDependencies = {
  taskRepo,
  implementationQueue,
  eventBus,
  validRoles: VALID_ROLES,
  maxDelegationDepth: MAX_DELEGATION_DEPTH,
};
