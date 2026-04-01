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
const listByEntity = vi.fn().mockResolvedValue({ data: [], total: 0 });
const createAuditLog = vi.fn().mockResolvedValue({
  id: "log-uuid",
  entityType: "feature",
  entityId: "feat-uuid",
  action: "updated",
  actorType: "user",
  metadata: {},
});
const createAgentDefinition = vi.fn().mockResolvedValue({
  id: "agent-uuid",
  workspaceId: "00000000-0000-0000-0000-000000000001",
  role: "architect",
  tier: "architect",
  name: "Architect Agent",
});
const listByWorkspace = vi.fn().mockResolvedValue([]);
const updateAgentDefinition = vi.fn().mockResolvedValue(null);
const getAgentById = vi.fn().mockResolvedValue(null);
const deleteAgentDefinition = vi.fn().mockResolvedValue(undefined);

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
  auditLogRepo: {
    createAuditLog,
    listByEntity,
    listByProject: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  },
  agentDefinitionRepo: {
    listByWorkspace,
    createAgentDefinition,
    updateAgentDefinition,
    getById: getAgentById,
    deleteAgentDefinition,
  },
}));

const { featureRoutes } = await import("../features.js");
const { ticketRoutes } = await import("../tickets.js");

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
  await app.register(ticketRoutes, { prefix: "/api/tickets" });
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

  it("GET /api/tickets returns list via feature alias", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/tickets" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.tickets).toEqual([]);
    expect(body.total).toBe(0);
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
    getFeatureById.mockResolvedValueOnce({
      id: UUID,
      title: "Current",
      status: "backlog",
      workspaceId: "00000000-0000-0000-0000-000000000001",
      assigneeMode: "orchestrator",
      assigneeAgentDefinitionId: null,
      orchestrationProjectId: null,
    });
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

  it("POST /api/features/:id/kickoff enqueues planning with canonical payload", async () => {
    getFeatureById
      .mockResolvedValueOnce({
        id: UUID,
        title: "Queue Success Feature",
        description: "Build feature orchestration",
        status: "backlog",
        workspaceId: "00000000-0000-0000-0000-000000000001",
        orchestrationProjectId: null,
      })
      .mockResolvedValueOnce({
        id: UUID,
        title: "Queue Success Feature",
        description: "Build feature orchestration",
        status: "in_progress",
        workspaceId: "00000000-0000-0000-0000-000000000001",
        orchestrationProjectId: "proj-uuid",
      });

    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: `/api/features/${UUID}/kickoff` });

    expect(res.statusCode).toBe(200);
    expect(mockQueues.planning.add).toHaveBeenCalledTimes(1);
    expect(mockQueues.planning.add).toHaveBeenCalledWith("plan", {
      projectId: "proj-uuid",
      goal: "Test",
      provider: "opencode",
    });
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

  it("GET /api/tickets/:id/log returns ticket logs", async () => {
    getFeatureById.mockResolvedValueOnce({ id: UUID, title: "Ticket", status: "todo" });
    listByEntity.mockResolvedValueOnce({
      data: [{ id: "log-uuid", entityId: UUID, action: "updated", actorType: "user", metadata: {} }],
      total: 1,
    });

    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/tickets/${UUID}/log?limit=20&offset=0` });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.logs).toHaveLength(1);
    expect(body.total).toBe(1);
  });

  it("POST /api/tickets/:id/log appends message entry", async () => {
    getFeatureById.mockResolvedValueOnce({
      id: UUID,
      title: "Ticket",
      status: "todo",
      workspaceId: "00000000-0000-0000-0000-000000000001",
      orchestrationProjectId: null,
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/tickets/${UUID}/log`,
      payload: {
        message: "Need more details from CEO",
        actorType: "agent",
        actorId: "agent-uuid",
        channel: "question",
      },
    });

    expect(res.statusCode).toBe(201);
    expect(createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        entityType: "feature",
        entityId: UUID,
        action: "updated",
        actorType: "agent",
      }),
    );
  });

  it("POST /api/tickets/:id/hire hires agent and creates delegated ticket", async () => {
    getFeatureById
      .mockResolvedValueOnce({
        id: UUID,
        title: "Hire architect",
        status: "todo",
        workspaceId: "00000000-0000-0000-0000-000000000001",
        orchestrationProjectId: null,
      })
      .mockResolvedValueOnce({
        id: "delegated-ticket-uuid",
        title: "Delegated",
        status: "backlog",
        workspaceId: "00000000-0000-0000-0000-000000000001",
      });

    createFeature.mockResolvedValueOnce({
      id: "delegated-ticket-uuid",
      title: "Delegated",
      status: "backlog",
      workspaceId: "00000000-0000-0000-0000-000000000001",
    });
    getAgentById.mockResolvedValueOnce({
      id: "agent-uuid",
      workspaceId: "00000000-0000-0000-0000-000000000001",
      role: "architect",
      tier: "architect",
      name: "Architect Agent",
    });

    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/tickets/${UUID}/hire`,
      payload: {
        role: "architect",
        tier: "architect",
        name: "Architect Agent",
        provider: "codex",
      },
    });

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.agent.id).toBe("agent-uuid");
    expect(body.delegatedTicket.id).toBe("delegated-ticket-uuid");
    expect(createAgentDefinition).toHaveBeenCalled();
  });

  it("GET /api/tickets/runner/status returns runner status", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/tickets/runner/status" });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.runner).toBeDefined();
    expect(typeof body.runner.running).toBe("boolean");
  });

  it("POST /api/tickets/runner/tick runs one scheduler cycle", async () => {
    listFeatures
      .mockResolvedValueOnce({ data: [], total: 0 }) // in_progress timeout scan
      .mockResolvedValueOnce({ data: [], total: 0 }) // todo candidates
      .mockResolvedValueOnce({ data: [], total: 0 }); // backlog candidates

    const app = await buildApp();
    const res = await app.inject({ method: "POST", url: "/api/tickets/runner/tick" });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.result.skipped).toBe(false);
    expect(body.result.kickedOff).toBe(0);
  });
});
