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
  return app;
}

const UUID = "00000000-0000-0000-0000-000000000000";

describe("Workspace Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWorkspaceById.mockResolvedValue(null);
  });

  it("GET /api/workspaces returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/workspaces" });
    expect(res.statusCode).toBe(200);
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

  it("POST /api/workspaces creates workspace", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/workspaces",
      payload: { name: "My Workspace" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.workspace.name).toBe("My Workspace");
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

  it("GET /api/workspaces/:id with invalid UUID returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/workspaces/not-a-uuid" });
    expect(res.statusCode).toBe(400);
  });
});
