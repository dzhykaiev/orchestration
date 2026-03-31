import { auditLogRepo } from "@orchestration/db";
import { AuditLogListQuerySchema, ProjectIdParamSchema } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";

export const auditLogRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/projects/:id/audit-log — project activity log
  app.get<{ Params: { id: string } }>("/:id/audit-log", async (request) => {
    const { id } = ProjectIdParamSchema.parse(request.params);
    const query = AuditLogListQuerySchema.parse(request.query);
    const result = await auditLogRepo.listByProject(id, query);
    return { ...result, limit: query.limit, offset: query.offset };
  });
};
