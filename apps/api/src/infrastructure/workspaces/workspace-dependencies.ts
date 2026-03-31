import { projectRepo, workspaceRepo } from "@orchestration/db";
import type { WorkspacesDependencies } from "../../application/workspaces/ports.js";

export const defaultWorkspacesDependencies: WorkspacesDependencies = {
  workspaceRepo,
  projectRepo,
};
