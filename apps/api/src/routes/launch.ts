import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { launchService } from "../services/launch.service.js";

const idParamSchema = z.object({ id: z.string().uuid() });

export const launchRoutes: FastifyPluginAsync = async (app) => {
  // POST /:id/launch — start project locally
  app.post<{ Params: { id: string } }>("/:id/launch", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    try {
      const result = await launchService.launch(id);
      return reply.status(200).send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Launch failed";
      return reply.status(400).send({ error: message, statusCode: 400 });
    }
  });

  // POST /:id/launch/stop — stop running project
  app.post<{ Params: { id: string } }>("/:id/launch/stop", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const result = launchService.stop(id);
    return reply.status(200).send(result);
  });

  // GET /:id/launch/status — check if project is running
  app.get<{ Params: { id: string } }>("/:id/launch/status", async (request) => {
    const { id } = idParamSchema.parse(request.params);
    return launchService.getStatus(id);
  });
};
