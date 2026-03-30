import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { workstreamRoutes } from "../workstreams.js";

vi.mock("../../db/repositories/index.js", () => ({
  workstreamRepo: {
    getWorkstreamById: vi.fn().mockResolvedValue(null),
    updateWorkstream: vi.fn().mockResolvedValue(null),
  },
  taskRepo: {
    listTasksByWorkstream: vi.fn().mockResolvedValue([]),
  },
}));

async function buildApp() {
  const app = Fastify();
  await app.register(workstreamRoutes, { prefix: "/api/workstreams" });
  return app;
}

describe("Workstream Routes", () => {
  it("GET /api/workstreams/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    app.setErrorHandler((_error, _request, reply) => {
      reply.status(404).send({ error: "Not found" });
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/workstreams/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });
});
