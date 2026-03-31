import { reviewRepo } from "@orchestration/db";
import { ReviewListQuerySchema } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const idParam = z.object({ id: z.string().uuid() });

export const taskReviewRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/tasks/:id/reviews — review history for a task
  app.get<{ Params: { id: string } }>("/:id/reviews", async (request) => {
    const { id } = idParam.parse(request.params);
    const reviews = await reviewRepo.listByTask(id);
    return { reviews };
  });
};

export const workstreamReviewRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/workstreams/:id/reviews — all reviews for workstream
  app.get<{ Params: { id: string } }>("/:id/reviews", async (request) => {
    const { id } = idParam.parse(request.params);
    const query = ReviewListQuerySchema.parse(request.query);
    return reviewRepo.listByWorkstream(id, query);
  });
};
