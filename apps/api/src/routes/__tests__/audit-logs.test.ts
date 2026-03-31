import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const listByProject = vi.fn().mockResolvedValue({ logs: [], total: 0 });

vi.mock("@orchestration/db", () => ({
  auditLogRepo: {
    listByProject,
  },
}));

const { auditLogRoutes } = await import("../audit-logs.js");

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
  await app.register(auditLogRoutes, { prefix: "/api/projects" });
  return app;
}

const UUID = "00000000-0000-0000-0000-000000000000";

describe("Audit Log Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/projects/:id/audit-log returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/projects/${UUID}/audit-log` });
    expect(res.statusCode).toBe(200);
    expect(listByProject).toHaveBeenCalled();
  });

  it("GET /api/projects/:id/audit-log with invalid UUID returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/projects/bad-id/audit-log" });
    expect(res.statusCode).toBe(400);
  });
});
