import { artifactRepo } from "@orchestration/db";
import { ArtifactListQuerySchema, ProjectIdParamSchema } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../domain/common/errors.js";

const idParam = z.object({ id: z.string().uuid() });

export const artifactRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/projects/:id/artifacts — list project artifacts
  app.get<{ Params: { id: string } }>("/:id/artifacts", async (request) => {
    const { id } = ProjectIdParamSchema.parse(request.params);
    const query = ArtifactListQuerySchema.parse(request.query);
    const result = await artifactRepo.listByProject(id, query);
    return { ...result, limit: query.limit, offset: query.offset };
  });
};

export const artifactDetailRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/artifacts/:id — get single artifact
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = idParam.parse(request.params);
    const artifact = await artifactRepo.getArtifactById(id);
    if (!artifact) throw new NotFoundError("Artifact not found");
    return { artifact };
  });

  // DELETE /api/artifacts/:id — delete artifact
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParam.parse(request.params);
    const artifact = await artifactRepo.getArtifactById(id);
    if (!artifact) throw new NotFoundError("Artifact not found");
    await artifactRepo.deleteArtifact(id);
    return reply.status(204).send();
  });
};
