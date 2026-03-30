import type { FastifyPluginAsync } from "fastify";
import { taskRepo, projectRepo } from "@orchestration/db";
import { implementationQueue } from "../services/orchestrator-client.js";
import { createTaskSchema, completeTaskSchema } from "../schemas/tasks.js";
import { idParamSchema } from "../schemas/projects.js";

export const taskRoutes: FastifyPluginAsync = async (app) => {
  // POST / — create agent task and enqueue
  app.post("/", async (request, reply) => {
    const body = createTaskSchema.parse(request.body);
    const task = await taskRepo.createTask(body);

    await implementationQueue.add("implement", {
      taskId: task.id,
      workstreamId: task.workstreamId,
      projectId: task.projectId,
      role: task.role,
      prompt: task.prompt,
    });

    return reply.status(201).send({ task });
  });

  // POST /:id/retry — manually retry a failed task
  app.post<{ Params: { id: string } }>("/:id/retry", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);

    const existing = await taskRepo.getTaskById(id);
    if (!existing) {
      return reply.status(404).send({ error: "Task not found", statusCode: 404 });
    }

    if (existing.status !== "failed") {
      return reply
        .status(400)
        .send({ error: "Only failed tasks can be retried", statusCode: 400 });
    }

    const task = await taskRepo.retryTask(id);
    if (!task) {
      return reply.status(500).send({ error: "Failed to retry task", statusCode: 500 });
    }

    await implementationQueue.add("implement", {
      taskId: task.id,
      workstreamId: task.workstreamId,
      projectId: task.projectId,
      role: task.role,
      prompt: task.prompt,
    });

    return { task };
  });

  // POST /:id/complete — mark task as completed or failed
  app.post<{ Params: { id: string } }>("/:id/complete", async (request, reply) => {
    const { id } = idParamSchema.parse(request.params);
    const body = completeTaskSchema.parse(request.body);

    const existing = await taskRepo.getTaskById(id);
    if (!existing) {
      return reply.status(404).send({ error: "Task not found", statusCode: 404 });
    }

    if (body.status === "completed") {
      await taskRepo.markTaskCompleted(id, body.output, body.filesModified, body.costUsd);
    } else {
      await taskRepo.markTaskFailed(id, body.error || body.output);
    }

    await projectRepo.updateTotalCost(existing.projectId);

    const task = await taskRepo.getTaskById(id);
    return { task };
  });
};
