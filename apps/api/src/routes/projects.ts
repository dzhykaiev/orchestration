import type { FastifyPluginAsync } from "fastify";
import { projectRepo, workstreamRepo, taskRepo } from "@orchestration/db";
import { planningQueue, implementationQueue } from "../services/orchestrator-client.js";
import {
  createProjectSchema,
  updateProjectSchema,
  idParamSchema,
  listQuerySchema,
} from "../schemas/projects.js";

export const projectRoutes: FastifyPluginAsync = async (app) => {
  // GET / — list projects (excludes archived by default)
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

  // PATCH /:id — update project (name, goal, provider, status, architecture)
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
    await planningQueue.add("plan", {
      projectId: id,
      goal: project.goal,
      provider: project.provider || process.env.LLM_PROVIDER || "opencode",
    });

    const workstreams = await workstreamRepo.listWorkstreamsByProject(id);
    return { project: updated, workstreams };
  });

  // POST /:id/stop — stop/cancel a running project
  app.post<{ Params: { id: string } }>("/:id/stop", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectRepo.getProjectById(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found", statusCode: 404 });
    }
    if (!["planning", "in_progress"].includes(project.status)) {
      return reply
        .status(400)
        .send({ error: `Cannot stop project in "${project.status}" status`, statusCode: 400 });
    }

    // Cancel all queued/running tasks
    await taskRepo.cancelTasksByProject(id);

    // Cancel all active workstreams
    await workstreamRepo.cancelWorkstreamsByProject(id);

    // Clean up BullMQ jobs — remove only this project's jobs from queues
    try {
      const planningJobs = await planningQueue.getJobs(["waiting", "delayed", "prioritized"]);
      for (const job of planningJobs) {
        if (job?.data?.projectId === id) {
          await job.remove();
        }
      }
      const implJobs = await implementationQueue.getJobs(["waiting", "delayed", "prioritized"]);
      for (const job of implJobs) {
        if (job?.data?.projectId === id) {
          await job.remove();
        }
      }
    } catch {
      // non-critical
    }

    // Update project status to failed
    const updated = await projectRepo.updateProject(id, { status: "failed" });

    return { project: updated };
  });

  // POST /:id/archive — archive a completed/failed project
  app.post<{ Params: { id: string } }>("/:id/archive", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectRepo.getProjectById(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found", statusCode: 404 });
    }
    if (["planning", "in_progress"].includes(project.status)) {
      return reply
        .status(400)
        .send({ error: "Cannot archive a running project. Stop it first.", statusCode: 400 });
    }

    const updated = await projectRepo.updateProject(id, { status: "archived" });
    return { project: updated };
  });

  // DELETE /:id — permanently delete a project
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const project = await projectRepo.getProjectById(id);
    if (!project) {
      return reply.status(404).send({ error: "Project not found", statusCode: 404 });
    }
    if (!["archived", "completed", "failed"].includes(project.status)) {
      return reply
        .status(400)
        .send({ error: "Only archived, completed, or failed projects can be deleted", statusCode: 400 });
    }

    await projectRepo.deleteProject(id);
    return reply.status(204).send();
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
