import type { FastifyPluginAsync } from "fastify";
import { workstreamRepo, taskRepo } from "../db/repositories/index.js";
import { idParamSchema } from "../schemas/projects.js";
import { updateWorkstreamSchema } from "../schemas/workstreams.js";

export const workstreamRoutes: FastifyPluginAsync = async (app) => {
  // GET /:id — get workstream by ID
  app.get<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const workstream = await workstreamRepo.getWorkstreamById(id);
    if (!workstream) {
      return reply.status(404).send({ error: "Workstream not found", statusCode: 404 });
    }
    return { workstream };
  });

  // PATCH /:id — update workstream
  app.patch<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateWorkstreamSchema.parse(request.body);
    const workstream = await workstreamRepo.updateWorkstream(id, body);
    if (!workstream) {
      return reply.status(404).send({ error: "Workstream not found", statusCode: 404 });
    }
    return { workstream };
  });

  // GET /:id/tasks — list tasks for a workstream
  app.get<{ Params: { id: string } }>("/:id/tasks", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const workstream = await workstreamRepo.getWorkstreamById(id);
    if (!workstream) {
      return reply.status(404).send({ error: "Workstream not found", statusCode: 404 });
    }
    const tasks = await taskRepo.listTasksByWorkstream(id);
    return { tasks };
  });
};
