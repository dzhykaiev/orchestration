import type { FastifyPluginAsync } from "fastify";
import { projectRepo, workstreamRepo } from "../db/repositories/index.js";
import { planningQueue } from "../services/orchestrator-client.js";
import {
  createProjectSchema,
  updateProjectSchema,
  idParamSchema,
  listQuerySchema,
} from "../schemas/projects.js";

export const projectRoutes: FastifyPluginAsync = async (app) => {
  // GET / — list projects
  app.get("/", async (request, reply) => {
    const query = listQuerySchema.parse(request.query);
    const result = await projectRepo.listProjects(query);
    return result;
  });

  // GET /:id — get project by ID
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectRepo.getProjectById(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found", statusCode: 404 });
    }
    return { project };
  });

  // POST / — create project
  app.post("/", async (request, reply) => {
    const body = createProjectSchema.parse(request.body);
    const project = await projectRepo.createProject(body);
    return reply.status(201).send({ project });
  });

  // PATCH /:id — update project
  app.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateProjectSchema.parse(request.body);
    const project = await projectRepo.updateProject(id, body);
    if (!project) {
      return reply.status(404).send({ error: "Project not found", statusCode: 404 });
    }
    return { project };
  });

  // POST /:id/plan — trigger planning pipeline
  app.post<{ Params: { id: string } }>("/:id/plan", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectRepo.getProjectById(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found", statusCode: 404 });
    }
    if (project.status !== "draft") {
      return reply
        .status(400)
        .send({ error: "Only draft projects can be planned", statusCode: 400 });
    }

    const updated = await projectRepo.updateProject(id, { status: "planning" });
    await planningQueue.add("plan", { projectId: id, goal: project.goal });

    const workstreams = await workstreamRepo.listWorkstreamsByProject(id);
    return { project: updated, workstreams };
  });

  // GET /:id/workstreams — list workstreams for a project
  app.get<{ Params: { id: string } }>("/:id/workstreams", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectRepo.getProjectById(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found", statusCode: 404 });
    }
    const workstreams = await workstreamRepo.listWorkstreamsByProject(id);
    return { workstreams };
  });
};
