import {
  auditLogRepo,
  featureRepo,
  projectRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import { assertProjectTransition, resolveProvider } from "@orchestration/shared";
import type { ProjectsDependencies } from "../../application/projects/ports.js";

export const defaultProjectsDependencies: ProjectsDependencies = {
  projectRepo,
  workstreamRepo,
  taskRepo,
  featureRepo,
  auditLogRepo,
  resolveProvider,
  assertProjectTransition,
};
