import type { Project, CreateProjectInput, UpdateProjectInput } from "../types/project.js";

// GET /api/projects
export interface ListProjectsResponse {
  projects: Project[];
  total: number;
}

// GET /api/projects/:id
export interface GetProjectResponse {
  project: Project;
}

// POST /api/projects
export interface CreateProjectRequest {
  body: CreateProjectInput;
}
export interface CreateProjectResponse {
  project: Project;
}

// PATCH /api/projects/:id
export interface UpdateProjectRequest {
  params: { id: string };
  body: UpdateProjectInput;
}
export interface UpdateProjectResponse {
  project: Project;
}

// POST /api/projects/:id/plan — trigger orchestrator planning
export interface PlanProjectRequest {
  params: { id: string };
}
export interface PlanProjectResponse {
  project: Project;
  workstreams: import("../types/workstream.js").Workstream[];
}
