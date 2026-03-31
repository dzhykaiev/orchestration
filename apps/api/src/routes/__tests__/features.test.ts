import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const listFeatures = vi.fn().mockResolvedValue({ data: [], total: 0 });
const getFeatureById = vi.fn().mockResolvedValue(null);
const createFeature = vi.fn().mockImplementation((input: Record<string, unknown>) =>
  Promise.resolve({
    id: "feat-uuid",
    title: input.title,
    description: input.description ?? null,
    status: "backlog",
    sortOrder: 0,
    orchestrationProjectId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);
const updateFeature = vi.fn().mockResolvedValue(null);
const deleteFeature = vi.fn().mockResolvedValue(undefined);
const reorderFeatures = vi.fn().mockResolvedValue(undefined);
const createProject = vi.fn().mockResolvedValue({
  id: "proj-uuid",
  name: "Test",
  goal: "Test",
  status: "draft",
  provider: "opencode",
  createdAt: new Date(),
  updatedAt: new Date(),
});
const deleteProject = vi.fn().mockResolvedValue(undefined);

vi.mock("@orchestration/db", () => ({
  featureRepo: {
    listFeatures,
    getFeatureById,
    createFeature,
    updateFeature,
    deleteFeature,
    reorderFeatures,
  },
  projectRepo: {
    createProject,
    deleteProject,
  },
}));

const { featureRoutes } = await import("../features.js");

const mockQueues = {
  planning: { add: vi.fn() },
  implementation: { add: vi.fn() },
  validation: { add: vi.fn() },
};

async function buildApp() {
  const app = Fastify();
  // biome-ignore lint/suspicious/noExplicitAny: test mock
  app.decorate("queues", mockQueues as any);
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
  await app.register(featureRoutes, { prefix: "/api/features" });
  return app;
}

const UUID = "00000000-0000-0000-0000-000000000000";

describe("Feature Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SELF_REPO_PATH = "/tmp/repo";
    getFeatureById.mockResolvedValue(null);
    createProject.mockResolvedValue({
      id: "proj-uuid",
      name: "Test",
      goal: "Test",
      status: "draft",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockQueues.planning.add.mockResolvedValue(undefined);
  });

  it("GET /api/features returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/features" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toEqual([]);
  });

  it("GET /api/features/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/features/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/features/:id returns feature when found", async () => {
    getFeatureById.mockResolvedValueOnce({ id: UUID, title: "Auth", status: "backlog" });
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/features/${UUID}` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.feature.title).toBe("Auth");
  });

  it("POST /api/features creates feature", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/features",
      payload: { title: "New Feature", workspaceId: "00000000-0000-0000-0000-000000000001" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.feature.title).toBe("New Feature");
  });

  it("POST /api/features with empty title returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/features",
      payload: { title: "" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("PATCH /api/features/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/features/${UUID}`,
      payload: { title: "Updated" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/features/:id updates when found", async () => {
    updateFeature.mockResolvedValueOnce({ id: UUID, title: "Updated", status: "backlog" });
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/features/${UUID}`,
      payload: { title: "Updated" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.feature.title).toBe("Updated");
  });

  it("DELETE /api/features/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/api/features/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/features/:id returns 204 on success", async () => {
    getFeatureById.mockResolvedValueOnce({ id: UUID, title: "Test", status: "backlog" });
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/api/features/${UUID}` });
    expect(res.statusCode).toBe(204);
  });

  it("PATCH /api/features/reorder bulk reorders", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/features/reorder",
      payload: {
        updates: [
          { id: UUID, sortOrder: 1 },
          { id: "00000000-0000-0000-0000-000000000001", sortOrder: 2 },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.ok).toBe(true);
  });

  it("POST /api/features/:id/kickoff returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: `/api/features/${UUID}/kickoff` });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/features/:id/kickoff returns 400 if already has project", async () => {
    getFeatureById.mockResolvedValueOnce({
      id: UUID,
      title: "Test",
      status: "backlog",
      orchestrationProjectId: "proj-uuid",
    });
    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: `/api/features/${UUID}/kickoff` });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/features/:id/kickoff rolls back project+feature when queue enqueue fails", async () => {
    getFeatureById.mockResolvedValueOnce({
      id: UUID,
      title: "Queue Failure Feature",
      description: "desc",
      status: "backlog",
      workspaceId: "00000000-0000-0000-0000-000000000001",
      orchestrationProjectId: null,
    });
    mockQueues.planning.add.mockRejectedValueOnce(new Error("queue offline"));

    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: `/api/features/${UUID}/kickoff` });

    expect(res.statusCode).toBe(400);
    expect(updateFeature).toHaveBeenNthCalledWith(1, UUID, {
      status: "in_progress",
      orchestrationProjectId: "proj-uuid",
    });
    expect(updateFeature).toHaveBeenNthCalledWith(2, UUID, {
      status: "backlog",
    });
    expect(deleteProject).toHaveBeenCalledWith("proj-uuid");
  });
});
