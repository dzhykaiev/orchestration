import { projectRepo, taskRepo, workstreamRepo } from "@orchestration/db";
import type { WorkstreamsDependencies } from "../../application/workstreams/ports.js";

export const defaultWorkstreamsDependencies: WorkstreamsDependencies = {
  projectRepo,
  workstreamRepo,
  taskRepo,
};
