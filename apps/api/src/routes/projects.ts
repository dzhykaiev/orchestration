import type { FastifyPluginAsync } from "fastify";
import {
  createProjectSchema,
  idParamSchema,
  listQuerySchema,
  updateProjectSchema,
} from "../schemas/projects.js";
import { createWorkstreamSchema } from "../schemas/workstreams.js";
import { projectService } from "../services/project.service.js";
import { workstreamService } from "../services/workstream.service.js";

export const projectRoutes: FastifyPluginAsync = async (app) => {
  // GET / — list projects (excludes archived by default)
  app.get("/", async (request) => {
    const query = listQuerySchema.parse(request.query);
    return projectService.list(query);
  });

  // GET /:id — get project by ID
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectService.getById(id);
    return { project };
  });

  // POST / — create project
  app.post("/", async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    const project = await projectService.create(body);
    return reply.status(201).send({ project });
  });

  // PATCH /:id — update project
  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateProjectSchema.parse(request.body);
    const project = await projectService.update(id, body);
    return { project };
  });

  // POST /:id/plan — trigger planning pipeline
  app.post<{ Params: { id: string } }>("/:id/plan", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return projectService.plan(id, app.queues.planning);
  });

  // POST /:id/stop — stop/cancel a running project
  app.post<{ Params: { id: string } }>("/:id/stop", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectService.stop(id, app.queues.planning, app.queues.implementation);
    return { project };
  });

  // POST /:id/archive — archive a completed/failed project
  app.post<{ Params: { id: string } }>("/:id/archive", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectService.archive(id);
    return { project };
  });

  // DELETE /:id — permanently delete a project
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    await projectService.delete(id);
    return reply.status(204).send();
  });

  // GET /:id/workstreams — list workstreams for a project
  app.get<{ Params: { id: string } }>("/:id/workstreams", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const workstreams = await projectService.listWorkstreams(id);
    return { workstreams };
  });

  // POST /:id/workstreams — create workstream for a project
  app.post<{ Params: { id: string } }>("/:id/workstreams", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = createWorkstreamSchema.parse(request.body);
    const workstream = await workstreamService.create({ ...body, projectId: id });
    return reply.status(201).send({ workstream });
  });
};
