import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const listWorkspaces = vi.fn().mockResolvedValue({ data: [], total: 0 });
const getWorkspaceById = vi.fn().mockResolvedValue(null);
const getWorkspaceBySlug = vi.fn().mockResolvedValue(null);
const createWorkspace = vi.fn().mockImplementation((input: Record<string, unknown>) =>
  Promise.resolve({
    id: "ws-uuid",
    name: input.name,
    slug: input.slug || "test-slug",
    description: input.description ?? null,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);
const updateWorkspace = vi.fn().mockImplementation((_id: string, input: Record<string, unknown>) =>
  Promise.resolve({
    id: _id,
    name: input.name ?? "Updated",
    slug: input.slug ?? "test-slug",
    description: null,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);
const deleteWorkspace = vi.fn().mockResolvedValue(undefined);
const listProjects = vi.fn().mockResolvedValue({ data: [], total: 0 });

vi.mock("@orchestration/db", () => ({
  workspaceRepo: {
    listWorkspaces,
    getWorkspaceById,
    getWorkspaceBySlug,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  },
  projectRepo: {
    listProjects,
  },
}));

const { workspaceRoutes } = await import("../workspaces.js");
const { resetApiAliasUsageMetrics } = await import("../alias-lifecycle.js");

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
  await app.register(workspaceRoutes, { prefix: "/api/workspaces" });
  await app.register(workspaceRoutes, { prefix: "/api/companies" });
  return app;
}

const UUID = "00000000-0000-0000-0000-000000000000";

describe("Workspace Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetApiAliasUsageMetrics();
    getWorkspaceById.mockResolvedValue(null);
  });

  it("GET /api/workspaces returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/workspaces" });
    expect(res.statusCode).toBe(200);
    expect(res.headers.deprecation).toBe("true");
    expect(res.headers.sunset).toBe("Wed, 30 Sep 2026 23:59:59 GMT");
    expect(res.headers["x-api-alias-legacy"]).toBe("/api/workspaces");
    expect(res.headers["x-api-alias-canonical"]).toBe("/api/companies");
    const body = JSON.parse(res.payload);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("GET /api/companies returns list via workspace alias", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/companies" });
    expect(res.statusCode).toBe(200);
    expect(res.headers.deprecation).toBeUndefined();
    expect(res.headers.sunset).toBeUndefined();
    const body = JSON.parse(res.payload);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("GET /api/workspaces/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/workspaces/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/workspaces/:id returns workspace when found", async () => {
    getWorkspaceById.mockResolvedValueOnce({ id: UUID, name: "Test", slug: "test" });
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/workspaces/${UUID}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.workspace.name).toBe("Test");
  });

  it("GET /api/companies/:id matches /api/workspaces/:id payload", async () => {
    const workspace = { id: UUID, name: "Parity", slug: "parity" };
    getWorkspaceById.mockResolvedValue(workspace);
    const app = await buildApp();
    const legacyRes = await app.inject({ method: "GET", url: `/api/workspaces/${UUID}` });
    const canonicalRes = await app.inject({ method: "GET", url: `/api/companies/${UUID}` });
    expect(legacyRes.statusCode).toBe(200);
    expect(canonicalRes.statusCode).toBe(200);
    expect(JSON.parse(canonicalRes.payload)).toEqual(JSON.parse(legacyRes.payload));
  });

  it("POST /api/workspaces creates workspace", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/workspaces",
      payload: { name: "My Workspace" },
    });
    expect(res.statusCode).toBe(201);
    expect(res.headers.deprecation).toBe("true");
    const body = JSON.parse(res.payload);
    expect(body.workspace.name).toBe("My Workspace");
  });

  it("POST /api/companies matches /api/workspaces payload", async () => {
    const app = await buildApp();
    const payload = { name: "Parity Workspace" };
    const legacyRes = await app.inject({
      method: "POST",
      url: "/api/workspaces",
      payload,
    });
    const canonicalRes = await app.inject({
      method: "POST",
      url: "/api/companies",
      payload,
    });
    expect(legacyRes.statusCode).toBe(201);
    expect(canonicalRes.statusCode).toBe(201);
    const legacyBody = JSON.parse(legacyRes.payload);
    const canonicalBody = JSON.parse(canonicalRes.payload);
    expect(canonicalBody.workspace).toMatchObject({
      id: legacyBody.workspace.id,
      name: legacyBody.workspace.name,
      slug: legacyBody.workspace.slug,
      description: legacyBody.workspace.description,
    });
    expect(canonicalRes.headers.deprecation).toBeUndefined();
  });

  it("POST /api/workspaces with duplicate slug returns 400", async () => {
    getWorkspaceBySlug.mockResolvedValueOnce({ id: "other", slug: "dupe" });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/workspaces",
      payload: { name: "Dupe", slug: "dupe" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("PATCH /api/workspaces/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/workspaces/${UUID}`,
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/workspaces/:id updates when found", async () => {
    getWorkspaceById.mockResolvedValueOnce({ id: UUID, name: "Old", slug: "old" });
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/workspaces/${UUID}`,
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(200);
    expect(updateWorkspace).toHaveBeenCalledWith(UUID, { name: "Updated" });
  });

  it("DELETE /api/workspaces/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/api/workspaces/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/workspaces/:id returns 204 on success", async () => {
    getWorkspaceById.mockResolvedValueOnce({ id: UUID, name: "Test", slug: "test" });
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/api/workspaces/${UUID}` });
    expect(res.statusCode).toBe(204);
    expect(deleteWorkspace).toHaveBeenCalledWith(UUID);
  });

  it("GET /api/workspaces/:id/projects returns 404 if workspace not found", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/workspaces/${UUID}/projects` });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/workspaces/:id/projects returns project list", async () => {
    getWorkspaceById.mockResolvedValueOnce({ id: UUID, name: "Test", slug: "test" });
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/workspaces/${UUID}/projects` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toEqual([]);
  });

  it("GET /api/companies/:id/projects matches /api/workspaces/:id/projects payload", async () => {
    getWorkspaceById.mockResolvedValue({ id: UUID, name: "Test", slug: "test" });
    listProjects.mockResolvedValue({
      data: [{ id: "proj-1", workspaceId: UUID, name: "P1" }],
      total: 1,
    });
    const app = await buildApp();
    const legacyRes = await app.inject({ method: "GET", url: `/api/workspaces/${UUID}/projects` });
    const canonicalRes = await app.inject({ method: "GET", url: `/api/companies/${UUID}/projects` });
    expect(legacyRes.statusCode).toBe(200);
    expect(canonicalRes.statusCode).toBe(200);
    expect(JSON.parse(canonicalRes.payload)).toEqual(JSON.parse(legacyRes.payload));
  });

  it("GET /api/workspaces/:id with invalid UUID returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/workspaces/not-a-uuid" });
    expect(res.statusCode).toBe(400);
  });
});
