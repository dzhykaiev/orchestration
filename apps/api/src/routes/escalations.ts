import { escalationRepo } from "@orchestration/db";
import { EscalationListQuerySchema, ProjectIdParamSchema } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../services/project.service.js";

const idParam = z.object({ id: z.string().uuid() });

export const projectEscalationRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/projects/:id/escalations — list escalations for project
  app.get<{ Params: { id: string } }>("/:id/escalations", async (request) => {
    const { id } = ProjectIdParamSchema.parse(request.params);
    const query = EscalationListQuerySchema.parse(request.query);
    return escalationRepo.listByProject(id, query);
  });
};

export const escalationRoutes: FastifyPluginAsync = async (app) => {
  // POST /api/escalations/:id/resolve — resolve escalation
  app.post<{ Params: { id: string } }>("/:id/resolve", async (request) => {
    const { id } = idParam.parse(request.params);
    const body = z.object({ resolution: z.string().min(1) }).parse(request.body);
    const escalation = await escalationRepo.resolveEscalation(id, body.resolution);
    if (!escalation) throw new NotFoundError("Escalation not found");
    return { escalation };
  });

  // POST /api/escalations/:id/dismiss — dismiss escalation
  app.post<{ Params: { id: string } }>("/:id/dismiss", async (request) => {
    const { id } = idParam.parse(request.params);
    const escalation = await escalationRepo.dismissEscalation(id);
    if (!escalation) throw new NotFoundError("Escalation not found");
    return { escalation };
  });
};
