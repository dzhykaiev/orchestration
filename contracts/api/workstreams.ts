import type {
  CreateWorkstreamInput,
  UpdateWorkstreamInput,
  Workstream,
} from "../types/workstream.js";

// GET /api/projects/:projectId/workstreams
export interface ListWorkstreamsResponse {
  workstreams: Workstream[];
}

// GET /api/workstreams/:id
export interface GetWorkstreamResponse {
  workstream: Workstream;
}

// POST /api/projects/:projectId/workstreams
export interface CreateWorkstreamRequest {
  params: { projectId: string };
  body: CreateWorkstreamInput;
}

// PATCH /api/workstreams/:id
export interface UpdateWorkstreamRequest {
  params: { id: string };
  body: UpdateWorkstreamInput;
}
