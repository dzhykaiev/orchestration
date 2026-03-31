import type { FastifyPluginAsync } from "fastify";
import {
  createFeatureSchema,
  featureIdParamSchema,
  featureListQuerySchema,
  reorderFeaturesSchema,
  updateFeatureSchema,
} from "../schemas/features.js";
import { featureService } from "../services/feature.service.js";

export const featureRoutes: FastifyPluginAsync = async (app) => {
  // GET / — list features
  app.get("/", async (request) => {
    const query = featureListQuerySchema.parse(request.query);
    const result = await featureService.list(query);
    return { ...result, limit: query.limit, offset: query.offset };
  });

  // GET /:id — get feature by ID
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = featureIdParamSchema.parse(request.params);
    const feature = await featureService.getById(id);
    return { feature };
  });

  // POST / — create feature
  app.post("/", async (request, reply) => {
    const body = createFeatureSchema.parse(request.body);
    const feature = await featureService.create(body);
    return reply.status(201).send({ feature });
  });

  // PATCH /reorder — bulk reorder features (must be before /:id)
  app.patch("/reorder", async (request) => {
    const { updates } = reorderFeaturesSchema.parse(request.body);
    await featureService.reorder(updates);
    return { ok: true };
  });

  // PATCH /:id — update feature
  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = featureIdParamSchema.parse(request.params);
    const body = updateFeatureSchema.parse(request.body);
    const feature = await featureService.update(id, body);
    return { feature };
  });

  // DELETE /:id — delete feature
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = featureIdParamSchema.parse(request.params);
    await featureService.delete(id);
    return reply.status(204).send();
  });

  // POST /:id/kickoff — convert feature to orchestration project
  app.post<{ Params: { id: string } }>("/:id/kickoff", async (request) => {
    const { id } = featureIdParamSchema.parse(request.params);
    return featureService.kickoff(id, app.queues.planning);
  });
};
