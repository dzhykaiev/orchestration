import Fastify from "fastify";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError } from "zod";

const createTask = vi.fn().mockImplementation((input: Record<string, unknown>) =>
  Promise.resolve({
    id: "task-uuid",
    ...input,
    status: "queued",
    output: null,
    filesModified: [],
    error: null,
    costUsd: "0",
    attempts: 0,
    maxAttempts: input.maxAttempts ?? 3,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }),
);
const getTaskById = vi.fn().mockResolvedValue(null);
const markTaskCompleted = vi.fn().mockResolvedValue(null);
const markTaskFailed = vi.fn().mockResolvedValue(null);
const retryTask = vi.fn().mockResolvedValue(null);
const updateTotalCost = vi.fn().mockResolvedValue(null);
const listChildTasks = vi.fn().mockResolvedValue([]);
const getTaskTree = vi.fn().mockResolvedValue([]);

vi.mock("@orchestration/db", () => ({
  taskRepo: {
    createTask,
    getTaskById,
    markTaskCompleted,
    markTaskFailed,
    retryTask,
    listChildTasks,
    getTaskTree,
  },
  projectRepo: {
    updateTotalCost,
  },
}));

const mockQueues = {
  planning: { add: vi.fn() },
  implementation: { add: vi.fn() },
  validation: { add: vi.fn() },
};

const { taskRoutes } = await import("../tasks.js");

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
  await app.register(taskRoutes, { prefix: "/api/tasks" });
  return app;
}

describe("Task Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
    const body = JSON.parse(res.payload);
    expect(body.task.role).toBe("backend");
    expect(body.task.status).toBe("queued");
  });

  it("POST /api/tasks/:id/retry returns 404 for non-existent task", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks/00000000-0000-0000-0000-000000000001/retry",
    });
    expect(res.statusCode).toBe(404);
  });

  it("POST /api/tasks/:id/complete returns 404 for non-existent task", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "POST",
      url: "/api/tasks/00000000-0000-0000-0000-000000000001/complete",
      payload: {
        taskId: "00000000-0000-0000-0000-000000000001",
        status: "completed",
        output: "Done",
        filesModified: [],
      },
    });
    expect(res.statusCode).toBe(404);
  });

  it("GET /api/tasks/:id/children returns list", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/tasks/00000000-0000-0000-0000-000000000001/children",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.tasks).toEqual([]);
    expect(listChildTasks).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
  });

  it("GET /api/tasks/:id/tree returns task tree", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/tasks/00000000-0000-0000-0000-000000000001/tree",
    });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.tasks).toEqual([]);
    expect(getTaskTree).toHaveBeenCalledWith("00000000-0000-0000-0000-000000000001");
  });

  it("GET /api/tasks/:id/children with invalid UUID returns 400", async () => {
    const app = await buildApp();
    const res = await app.inject({
      method: "GET",
      url: "/api/tasks/not-a-uuid/children",
    });
    expect(res.statusCode).toBe(400);
  });
});
