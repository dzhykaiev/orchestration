import { featureRepo } from "@orchestration/db";
import type { FastifyPluginAsync } from "fastify";
import { createFeatureSchema, featureListQuerySchema } from "../schemas/features.js";
import {
  createWorkspaceSchema,
  projectListQuerySchema,
  updateWorkspaceSchema,
  workspaceIdParamSchema,
  workspaceListQuerySchema,
} from "../schemas/workspaces.js";
import { workspaceService } from "../services/workspace.service.js";

export const workspaceRoutes: FastifyPluginAsync = async (app) => {
  // GET / — list workspaces
  app.get("/", async (request) => {
    const query = workspaceListQuerySchema.parse(request.query);
    return workspaceService.list(query);
  });

  // GET /:id — get workspace by ID
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = workspaceIdParamSchema.parse(request.params);
    const workspace = await workspaceService.getById(id);
    return { workspace };
  });

  // POST / — create workspace
  app.post("/", async (request, reply) => {
    const body = createWorkspaceSchema.parse(request.body);
    const workspace = await workspaceService.create(body);
    return reply.status(201).send({ workspace });
  });

  // PATCH /:id — update workspace
  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = workspaceIdParamSchema.parse(request.params);
    const body = updateWorkspaceSchema.parse(request.body);
    const workspace = await workspaceService.update(id, body);
    return { workspace };
  });

  // DELETE /:id — delete workspace
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = workspaceIdParamSchema.parse(request.params);
    await workspaceService.delete(id);
    return reply.status(204).send();
  });

  // GET /:id/projects — list projects in workspace
  app.get<{ Params: { id: string } }>("/:id/projects", async (request) => {
    const { id } = workspaceIdParamSchema.parse(request.params);
    const query = projectListQuerySchema.parse(request.query);
    return workspaceService.listProjects(id, query);
  });

  // GET /:id/features — list features in workspace
  app.get<{ Params: { id: string } }>("/:id/features", async (request) => {
    const { id } = workspaceIdParamSchema.parse(request.params);
    await workspaceService.getById(id); // ensure workspace exists
    const query = featureListQuerySchema.parse(request.query);
    return featureRepo.listFeaturesByWorkspace(id, query);
  });

  // POST /:id/features — create feature in workspace
  app.post<{ Params: { id: string } }>("/:id/features", async (request, reply) => {
    const { id } = workspaceIdParamSchema.parse(request.params);
    await workspaceService.getById(id); // ensure workspace exists
    const body = createFeatureSchema.parse(request.body);
    const feature = await featureRepo.createFeature({ ...body, workspaceId: id });
    return reply.status(201).send({ feature });
  });
};
