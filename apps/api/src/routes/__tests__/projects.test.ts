import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const listProjects = vi.fn().mockResolvedValue({ data: [], total: 0 });
const getProjectById = vi.fn().mockResolvedValue(null);
const createProject = vi.fn().mockImplementation((input: { name: string; goal: string }) =>
  Promise.resolve({
    id: "test-uuid",
    name: input.name,
    goal: input.goal,
    status: "draft",
    architecture: null,
    provider: "opencode",
    totalCostUsd: "0",
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);
const updateProject = vi.fn().mockResolvedValue(null);
const deleteProject = vi.fn().mockResolvedValue(undefined);
const transitionStatus = vi.fn().mockResolvedValue(null);
const listWorkstreamsByProject = vi.fn().mockResolvedValue([]);
const cancelWorkstreamsByProject = vi.fn().mockResolvedValue([]);
const listTasksByProject = vi.fn().mockResolvedValue([]);
const listFeatures = vi.fn().mockResolvedValue({ data: [], total: 0 });
const createWorkstream = vi.fn().mockImplementation((input: Record<string, unknown>) =>
  Promise.resolve({
    id: "ws-uuid",
    ...input,
    status: "pending",
    dependencies: input.dependencies ?? [],
    deliverables: input.deliverables ?? [],
    ownedPaths: input.ownedPaths ?? [],
    assignedAgent: null,
    order: input.order ?? 0,
    validationStatus: null,
    validationOutput: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);

vi.mock("@orchestration/db", () => ({
  projectRepo: {
    listProjects,
    getProjectById,
    createProject,
    updateProject,
    deleteProject,
    transitionStatus,
  },
  workstreamRepo: {
    listWorkstreamsByProject,
    cancelWorkstreamsByProject,
    createWorkstream,
    getWorkstreamById: vi.fn().mockResolvedValue(null),
  },
  taskRepo: {
    cancelTasksByProject: vi.fn().mockResolvedValue([]),
    listTasksByProject,
  },
  featureRepo: {
    getFeatureByProjectId: vi.fn().mockResolvedValue(null),
    listFeatures,
  },
  auditLogRepo: {
    createAuditLog: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockQueues = {
  planning: { add: vi.fn(), getJobs: vi.fn().mockResolvedValue([]) },
  implementation: { add: vi.fn(), getJobs: vi.fn().mockResolvedValue([]) },
  validation: { add: vi.fn() },
};

// Import after mock setup
const { projectRoutes } = await import("../projects.js");

async function buildApp() {
  const app = Fastify();
  // biome-ignore lint/suspicious/noExplicitAny: test mock doesn't need full Queue type
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
  await app.register(projectRoutes, { prefix: "/api/projects" });
  return app;
}

describe("Project Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProjectById.mockResolvedValue(null);
    listProjects.mockResolvedValue({ data: [], total: 0 });
    listFeatures.mockResolvedValue({ data: [], total: 0 });
    mockQueues.planning.add.mockResolvedValue(undefined);
  });

  it("GET /api/projects/:id/issues returns bug tickets reported from project", async () => {
    const projectId = "00000000-0000-0000-0000-000000000000";
    getProjectById.mockResolvedValueOnce({
      id: projectId,
      name: "Test",
      goal: "Test",
      status: "in_progress",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    listFeatures.mockResolvedValueOnce({
      data: [{ id: "feat-1", type: "bug", sourceProjectId: projectId, title: "UI bug" }],
      total: 1,
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: `/api/projects/${projectId}/issues`,
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.total).toBe(1);
    expect(listFeatures).toHaveBeenCalledWith({
      type: "bug",
      sourceProjectId: projectId,
      status: undefined,
      limit: 20,
      offset: 0,
    });
  });

  it("GET /api/projects returns empty list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.data).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("POST /api/projects creates a project", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: {
        name: "Test Project",
        goal: "Build something",
        workspaceId: "00000000-0000-0000-0000-000000000001",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.project.name).toBe("Test Project");
    expect(body.project.status).toBe("draft");
  });

  it("POST /api/projects with empty name returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "", goal: "Build something" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("GET /api/projects/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/projects/:id/workstreams creates a workstream", async () => {
    getProjectById.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test",
      goal: "Test",
      status: "in_progress",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/workstreams",
      payload: {
        name: "Backend API",
        objective: "Build REST endpoints",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.workstream.name).toBe("Backend API");
  });

  it("POST /api/projects/:id/workstreams returns 400 for invalid dependencies", async () => {
    const projectId = "00000000-0000-0000-0000-000000000000";
    getProjectById.mockResolvedValueOnce({
      id: projectId,
      name: "Test",
      goal: "Test",
      status: "in_progress",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    listWorkstreamsByProject.mockResolvedValueOnce([
      {
        id: "11111111-1111-1111-1111-111111111111",
        projectId,
        name: "Existing WS",
        objective: "existing",
        status: "pending",
        dependencies: [],
        deliverables: [],
        ownedPaths: [],
        order: 0,
      },
    ]);

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/projects/${projectId}/workstreams`,
      payload: {
        name: "Dependent WS",
        objective: "build",
        dependencies: ["22222222-2222-2222-2222-222222222222"],
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.payload);
    expect(body.error).toContain("Invalid dependencies");
  });

  it("PATCH /api/projects/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/projects/00000000-0000-0000-0000-000000000000",
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/projects/:id updates when found", async () => {
    updateProject.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Updated",
      status: "draft",
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/projects/00000000-0000-0000-0000-000000000000",
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.project.name).toBe("Updated");
  });

  it("DELETE /api/projects/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/projects/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/projects/:id returns 400 for active project", async () => {
    getProjectById.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test",
      goal: "Test",
      status: "in_progress",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "DELETE",
      url: "/api/projects/00000000-0000-0000-0000-000000000000",
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/projects/:id/plan returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/plan",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/projects/:id/plan returns 400 if not draft", async () => {
    getProjectById.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test",
      goal: "Test",
      status: "in_progress",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/plan",
    });
    expect(res.statusCode).toBe(400);
  });

  it("POST /api/projects/:id/plan succeeds for draft project", async () => {
    getProjectById.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test",
      goal: "Build it",
      status: "draft",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    transitionStatus.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test",
      goal: "Build it",
      status: "planning",
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/plan",
    });
    expect(res.statusCode).toBe(200);
    expect(mockQueues.planning.add).toHaveBeenCalledTimes(1);
    expect(mockQueues.planning.add).toHaveBeenCalledWith("plan", {
      projectId: "00000000-0000-0000-0000-000000000000",
      goal: "Build it",
      provider: "opencode",
    });
  });

  it("POST /api/projects/:id/stop returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/stop",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/projects/:id/stop returns 409 for completed project", async () => {
    getProjectById.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test",
      goal: "Test",
      status: "completed",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/stop",
    });
    expect(res.statusCode).toBe(409);
  });

  it("POST /api/projects/:id/archive returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/archive",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/projects/:id/archive returns 409 for running project", async () => {
    getProjectById.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test",
      goal: "Test",
      status: "in_progress",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/archive",
    });
    expect(res.statusCode).toBe(409);
  });

  it("GET /api/projects/:id/detail returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/detail",
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/projects/:id/detail returns aggregated data", async () => {
    getProjectById.mockResolvedValueOnce({
      id: "00000000-0000-0000-0000-000000000000",
      name: "Test",
      goal: "Test",
      status: "in_progress",
      provider: "opencode",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/detail",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.project).toBeDefined();
    expect(body.workstreams).toBeDefined();
    expect(body.tasks).toBeDefined();
  });

  it("GET /api/projects/:id/workstreams returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/00000000-0000-0000-0000-000000000000/workstreams",
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/projects with invalid UUID returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/not-a-uuid",
    });
    expect(res.statusCode).toBe(400);
  });
});
