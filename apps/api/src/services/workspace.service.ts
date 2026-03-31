import type { WorkspacesDependencies } from "../application/workspaces/ports.js";
import { WorkspaceUseCases } from "../application/workspaces/workspace-use-cases.js";
import { BusinessError, NotFoundError } from "../domain/common/errors.js";
import { defaultWorkspacesDependencies } from "../infrastructure/workspaces/workspace-dependencies.js";

export class WorkspaceService extends WorkspaceUseCases {
  constructor(deps: WorkspacesDependencies = defaultWorkspacesDependencies) {
    super(deps);
  }
}

export { BusinessError, NotFoundError };

export const workspaceService = new WorkspaceService();
