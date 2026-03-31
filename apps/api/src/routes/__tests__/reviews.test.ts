import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const listByTask = vi.fn().mockResolvedValue([]);
const listByWorkstream = vi.fn().mockResolvedValue({ data: [], total: 0 });

vi.mock("@orchestration/db", () => ({
  reviewRepo: {
    listByTask,
    listByWorkstream,
  },
}));

const { taskReviewRoutes, workstreamReviewRoutes } = await import("../reviews.js");

async function buildApp() {
  const app = Fastify();
  app.setErrorHandler((error: Error & { statusCode?: number }, _request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(400).send({
        error: "Validation Error",
        statusCode: 400,
        details: error.flatten(),
      });
    }
    const statusCode = error.statusCode ?? 500;
    return reply.status(statusCode).send({ error: error.message, statusCode });
  });
  await app.register(taskReviewRoutes, { prefix: "/api/tasks" });
  await app.register(workstreamReviewRoutes, { prefix: "/api/workstreams" });
  return app;
}

const UUID = "00000000-0000-0000-0000-000000000000";

describe("Review Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/tasks/:id/reviews returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/tasks/${UUID}/reviews` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.reviews).toEqual([]);
  });

  it("GET /api/workstreams/:id/reviews returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/workstreams/${UUID}/reviews` });
    expect(res.statusCode).toBe(200);
  });

  it("GET /api/tasks/:id/reviews with invalid UUID returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/tasks/not-uuid/reviews" });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/workstreams/:id/reviews with invalid UUID returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/workstreams/not-uuid/reviews" });
    expect(res.statusCode).toBe(400);
  });
});
