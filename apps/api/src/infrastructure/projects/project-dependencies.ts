import {
  auditLogRepo,
  featureRepo,
  projectRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import { PROJECT_TRANSITIONS, assertTransition, resolveProvider } from "@orchestration/shared";
import type { ProjectStatus } from "@orchestration/shared";
import type { ProjectsDependencies } from "../../application/projects/ports.js";

function assertProjectTransition(from: ProjectStatus, to: ProjectStatus) {
  assertTransition(PROJECT_TRANSITIONS, from, to, "project");
}

export const defaultProjectsDependencies: ProjectsDependencies = {
  projectRepo,
  workstreamRepo,
  taskRepo,
  featureRepo,
  auditLogRepo,
  resolveProvider,
  assertProjectTransition,
};
