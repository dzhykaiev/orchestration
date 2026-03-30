import { describe, it, expect, vi, beforeEach } from "vitest";
import Fastify from "fastify";
import { ZodError } from "zod";
import { projectRoutes } from "../projects.js";

vi.mock("@orchestration/db", () => ({
  projectRepo: {
    listProjects: vi.fn().mockResolvedValue({ projects: [], total: 0 }),
    getProjectById: vi.fn().mockResolvedValue(null),
    createProject: vi.fn().mockImplementation((input: { name: string; goal: string }) =>
      Promise.resolve({
        id: "test-uuid",
        name: input.name,
        goal: input.goal,
        status: "draft",
        architecture: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    updateProject: vi.fn().mockResolvedValue(null),
  },
  workstreamRepo: {
    listWorkstreamsByProject: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("../../services/orchestrator-client.js", () => ({
  planningQueue: { add: vi.fn() },
  implementationQueue: { add: vi.fn() },
}));

async function buildApp() {
  const app = Fastify();
  app.setErrorHandler((error: Error & { statusCode?: number }, request, reply) => {
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
  it("GET /api/projects returns empty list", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.projects).toEqual([]);
    expect(body.total).toBe(0);
  });

  it("POST /api/projects creates a project", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "Test Project", goal: "Build something" },
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
});
