import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const listByWorkspace = vi.fn().mockResolvedValue([]);
const createAgentDefinition = vi.fn().mockImplementation((input: Record<string, unknown>) =>
  Promise.resolve({
    id: "agent-uuid",
    ...input,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);
const updateAgentDefinition = vi.fn().mockResolvedValue(null);
const deleteAgentDefinition = vi.fn().mockResolvedValue(undefined);
const getById = vi.fn().mockResolvedValue(null);

vi.mock("@orchestration/db", () => ({
  agentDefinitionRepo: {
    listByWorkspace,
    createAgentDefinition,
    updateAgentDefinition,
    deleteAgentDefinition,
    getById,
  },
}));

const { workspaceAgentRoutes, agentDefinitionRoutes } = await import("../agent-definitions.js");

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
  await app.register(workspaceAgentRoutes, { prefix: "/api/workspaces" });
  await app.register(agentDefinitionRoutes, { prefix: "/api/agents" });
  return app;
}

const UUID = "00000000-0000-0000-0000-000000000000";

describe("Agent Definition Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/workspaces/:id/agents returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: `/api/workspaces/${UUID}/agents` });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.agents).toEqual([]);
  });

  it("POST /api/workspaces/:id/agents creates agent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: `/api/workspaces/${UUID}/agents`,
      payload: { name: "Backend Agent", role: "backend", tier: "lead" },
    });
    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.payload);
    expect(body.agent.name).toBe("Backend Agent");
    expect(body.agent.workspaceId).toBe(UUID);
  });

  it("PATCH /api/agents/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/agents/${UUID}`,
      payload: { name: "Updated" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("PATCH /api/agents/:id updates agent when found", async () => {
    updateAgentDefinition.mockResolvedValueOnce({
      id: UUID,
      name: "Updated Agent",
      role: "backend",
    });
    const app = await buildApp();
    const res = await app.inject({
      method: "PATCH",
      url: `/api/agents/${UUID}`,
      payload: { name: "Updated Agent" },
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.agent.name).toBe("Updated Agent");
  });

  it("DELETE /api/agents/:id returns 404 for non-existent", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/api/agents/${UUID}` });
    expect(res.statusCode).toBe(404);
  });

  it("DELETE /api/agents/:id returns 204 on success", async () => {
    getById.mockResolvedValueOnce({ id: UUID, name: "Agent", role: "backend" });
    const app = await buildApp();
    const res = await app.inject({ method: "DELETE", url: `/api/agents/${UUID}` });
    expect(res.statusCode).toBe(204);
    expect(deleteAgentDefinition).toHaveBeenCalledWith(UUID);
  });
});
