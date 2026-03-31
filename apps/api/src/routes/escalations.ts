import { EscalationListQuerySchema, ProjectIdParamSchema } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { escalationService } from "../services/escalation.service.js";

const idParam = z.object({ id: z.string().uuid() });

export const projectEscalationRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/projects/:id/escalations — list escalations for project
  app.get<{ Params: { id: string } }>("/:id/escalations", async (request) => {
    const { id } = ProjectIdParamSchema.parse(request.params);
    const query = EscalationListQuerySchema.parse(request.query);
    const result = await escalationService.listByProject(id, query);
    return { ...result, limit: query.limit, offset: query.offset };
  });
};

export const escalationRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/escalations/:id/resolve — resolve escalation
  app.post<{ Params: { id: string } }>("/:id/resolve", async (request) => {
    const { id } = idParam.parse(request.params);
    const body = z.object({ resolution: z.string().min(1) }).parse(request.body);
    const escalation = await escalationService.resolve(id, body.resolution);
    return { escalation };
  });

  // POST /api/escalations/:id/dismiss — dismiss escalation
  app.post<{ Params: { id: string } }>("/:id/dismiss", async (request) => {
    const { id } = idParam.parse(request.params);
    const escalation = await escalationService.dismiss(id);
    return { escalation };
  });
};
