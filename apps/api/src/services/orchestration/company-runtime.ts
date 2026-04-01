import type { CompanyRuntimeContext } from "@orchestration/shared";
import { projectService } from "../project.service.js";
import {
  resolveCompanyProjectRoot,
  resolveCompanyRoot,
} from "../runtime/company-paths.js";

export async function resolveCompanyRuntimeContext(projectId: string): Promise<CompanyRuntimeContext> {
  const project = await projectService.getById(projectId);

  return {
    companyId: project.workspaceId,
    projectId: project.id,
    companyRoot: resolveCompanyRoot(project.workspaceId),
    projectRoot: resolveCompanyProjectRoot(project.workspaceId, project.id),
  };
}
