import type { FastifyPluginAsync } from "fastify";
import { idParamSchema } from "../schemas/projects.js";
import { updateWorkstreamSchema } from "../schemas/workstreams.js";
import { workstreamService } from "../services/workstream.service.js";

export const workstreamRoutes: FastifyPluginAsync = async (app) => {
  // GET /:id — get workstream by ID
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const workstream = await workstreamService.getById(id);
    return { workstream };
  });

  // PATCH /:id — update workstream
  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const body = updateWorkstreamSchema.parse(request.body);
    const workstream = await workstreamService.update(id, body);
    return { workstream };
  });

  // GET /:id/tasks — list tasks for a workstream
  app.get<{ Params: { id: string } }>("/:id/tasks", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const tasks = await workstreamService.listTasks(id);
    return { tasks };
  });
};
