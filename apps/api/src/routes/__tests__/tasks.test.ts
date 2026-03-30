import { describe, it, expect, vi } from "vitest";
import Fastify from "fastify";
import { taskRoutes } from "../tasks.js";

vi.mock("@orchestration/db", () => ({
  taskRepo: {
    createTask: vi.fn().mockImplementation((input) =>
      Promise.resolve({
        id: "task-uuid",
        ...input,
        status: "queued",
        output: null,
        filesModified: [],
        error: null,
        attempts: 0,
        maxAttempts: 3,
        startedAt: null,
        completedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    ),
    getTaskById: vi.fn().mockResolvedValue(null),
    markTaskCompleted: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock("../../services/orchestrator-client.js", () => ({
  implementationQueue: { add: vi.fn() },
}));

async function buildApp() {
  const app = Fastify();
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  return app;
}

describe("Task Routes", () => {
  it("POST /api/tasks creates a task", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks",
      payload: {
        workstreamId: "00000000-0000-0000-0000-000000000001",
        projectId: "00000000-0000-0000-0000-000000000002",
        role: "backend",
        prompt: "Implement user service",
      },
    });
    expect(res.statusCode).toBe(201);
  });
});
