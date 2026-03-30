import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { ZodError } from "zod";

const getWorkstreamById = vi.fn().mockResolvedValue(null);
const updateWorkstream = vi.fn().mockResolvedValue(null);
const listTasksByWorkstream = vi.fn().mockResolvedValue([]);

vi.mock("@orchestration/db", () => ({
  workstreamRepo: {
    getWorkstreamById,
    updateWorkstream,
  },
  taskRepo: {
    listTasksByWorkstream,
  },
  projectRepo: {
    getProjectById: vi.fn().mockResolvedValue(null),
  },
}));

const { workstreamRoutes } = await import("../workstreams.js");

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
  await app.register(workstreamRoutes, { prefix: "/api/workstreams" });
  return app;
}

describe("Workstream Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/workstreams/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/workstreams/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/workstreams/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/workstreams/00000000-0000-0000-0000-000000000000",
      payload: { status: "in_progress" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/workstreams/:id/tasks returns 404 if workstream not found", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/workstreams/00000000-0000-0000-0000-000000000000/tasks",
    });
    expect(res.statusCode).toBe(404);
  });
});
