import type { FastifyPluginAsync } from "fastify";
import { agentService } from "../services/agent.service.js";
import { createTaskSchema, completeTaskSchema } from "../schemas/tasks.js";
import { idParamSchema } from "../schemas/projects.js";

export const taskRoutes: FastifyPluginAsync = async (app) => {
  // POST / — create agent task and enqueue
  app.post("/", async (request, reply) => {
    const body = createTaskSchema.parse(request.body);
    const task = await agentService.create(body, app.queues.implementation);
    return reply.status(201).send({ task });
  });

  // POST /:id/retry — manually retry a failed task
  app.post<{ Params: { id: string } }>("/:id/retry", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const task = await agentService.retry(id, app.queues.implementation);
    return { task };
  });

  // POST /:id/complete — mark task as completed or failed
  app.post<{ Params: { id: string } }>("/:id/complete", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    const body = completeTaskSchema.parse(request.body);
    const task = await agentService.complete(id, body);
    return { task };
  });
};
