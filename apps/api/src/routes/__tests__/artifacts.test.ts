import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const listByProject = vi.fn().mockResolvedValue({ artifacts: [], total: 0 });
const getArtifactById = vi.fn().mockResolvedValue(null);
const deleteArtifact = vi.fn().mockResolvedValue(undefined);

vi.mock("@orchestration/db", () => ({
  artifactRepo: {
    listByProject,
    getArtifactById,
    deleteArtifact,
  },
}));

const { artifactRoutes, artifactDetailRoutes } = await import("../artifacts.js");

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
  await app.register(artifactRoutes, { prefix: "/api/projects" });
  await app.register(artifactDetailRoutes, { prefix: "/api/artifacts" });
  return app;
}

const UUID = "00000000-0000-0000-0000-000000000000";

describe("Artifact Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/projects/:id/artifacts returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/projects/${UUID}/artifacts` });
    expect(res.statusCode).toBe(200);
  });

  it("GET /api/artifacts/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/artifacts/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/artifacts/:id returns artifact when found", async () => {
    getArtifactById.mockResolvedValueOnce({ id: UUID, type: "code", content: "hello" });
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/artifacts/${UUID}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.artifact.id).toBe(UUID);
  });

  it("DELETE /api/artifacts/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/api/artifacts/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/artifacts/:id returns 204 on success", async () => {
    getArtifactById.mockResolvedValueOnce({ id: UUID, type: "code" });
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/api/artifacts/${UUID}` });
    expect(res.statusCode).toBe(204);
    expect(deleteArtifact).toHaveBeenCalledWith(UUID);
  });

  it("GET /api/projects/:id/artifacts with invalid UUID returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/projects/bad-id/artifacts" });
    expect(res.statusCode).toBe(400);
  });
});
