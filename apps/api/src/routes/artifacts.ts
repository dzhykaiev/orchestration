import { ArtifactListQuerySchema, ProjectIdParamSchema } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { artifactService } from "../services/artifact.service.js";

const idParam = z.object({ id: z.string().uuid() });

export const artifactRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/projects/:id/artifacts — list project artifacts
  app.get<{ Params: { id: string } }>("/:id/artifacts", async (request) => {
    const { id } = ProjectIdParamSchema.parse(request.params);
    const query = ArtifactListQuerySchema.parse(request.query);
    const result = await artifactService.listByProject(id, query);
    return { ...result, limit: query.limit, offset: query.offset };
  });
};

export const artifactDetailRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/artifacts/:id — get single artifact
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = idParam.parse(request.params);
    const artifact = await artifactService.getById(id);
    return { artifact };
  });

  // DELETE /api/artifacts/:id — delete artifact
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParam.parse(request.params);
    await artifactService.delete(id);
    return reply.status(204).send();
  });
};
