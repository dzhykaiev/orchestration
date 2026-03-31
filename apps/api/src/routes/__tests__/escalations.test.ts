import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const listByProject = vi.fn().mockResolvedValue({ escalations: [], total: 0 });
const resolveEscalation = vi.fn().mockResolvedValue(null);
const dismissEscalation = vi.fn().mockResolvedValue(null);

vi.mock("@orchestration/db", () => ({
  escalationRepo: {
    listByProject,
    resolveEscalation,
    dismissEscalation,
  },
}));

const { projectEscalationRoutes, escalationRoutes } = await import("../escalations.js");

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
  await app.register(projectEscalationRoutes, { prefix: "/api/projects" });
  await app.register(escalationRoutes, { prefix: "/api/escalations" });
  return app;
}

const UUID = "00000000-0000-0000-0000-000000000000";

describe("Escalation Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/projects/:id/escalations returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/projects/${UUID}/escalations` });
    expect(res.statusCode).toBe(200);
  });

  it("POST /api/escalations/:id/resolve returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/escalations/${UUID}/resolve`,
      payload: { resolution: "Fixed the issue" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/escalations/:id/resolve succeeds when found", async () => {
    resolveEscalation.mockResolvedValueOnce({
      id: UUID,
      status: "resolved",
      resolution: "Fixed",
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/escalations/${UUID}/resolve`,
      payload: { resolution: "Fixed the issue" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.escalation.status).toBe("resolved");
  });

  it("POST /api/escalations/:id/resolve with empty resolution returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/escalations/${UUID}/resolve`,
      payload: { resolution: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/escalations/:id/dismiss returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/escalations/${UUID}/dismiss`,
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/escalations/:id/dismiss succeeds when found", async () => {
    dismissEscalation.mockResolvedValueOnce({ id: UUID, status: "dismissed" });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/escalations/${UUID}/dismiss`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.escalation.status).toBe("dismissed");
  });
});
