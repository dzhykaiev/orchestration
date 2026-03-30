import { projectRepo, taskRepo } from "@orchestration/db";
import type { CreateAgentTaskInput } from "@orchestration/shared";
import type { Queue } from "bullmq";
import { BusinessError, NotFoundError } from "./project.service.js";

export class AgentService {
  async create(input: CreateAgentTaskInput, implementationQueue: Queue) {
    const task = await taskRepo.createTask(input);
    if (!task) {
      throw new Error("Failed to create task");
    }

    await implementationQueue.add("implement", {
      taskId: task.id,
      workstreamId: task.workstreamId,
      projectId: task.projectId,
      role: task.role,
      prompt: task.prompt,
    });

    return task;
  }

  async retry(id: string, implementationQueue: Queue) {
    const existing = await taskRepo.getTaskById(id);
    if (!existing) {
      throw new NotFoundError("Task not found");
    }

    if (existing.status !== "failed") {
      throw new BusinessError("Only failed tasks can be retried");
    }

    const task = await taskRepo.retryTask(id);
    if (!task) {
      throw new Error("Failed to retry task");
    }

    await implementationQueue.add("implement", {
      taskId: task.id,
      workstreamId: task.workstreamId,
      projectId: task.projectId,
      role: task.role,
      prompt: task.prompt,
    });

    return task;
  }

  async complete(
    id: string,
    body: {
      taskId: string;
      status: "completed" | "failed";
      output: string;
      filesModified: string[];
      error?: string;
      costUsd?: number;
    },
  ) {
    const existing = await taskRepo.getTaskById(id);
    if (!existing) {
      throw new NotFoundError("Task not found");
    }

    if (body.status === "completed") {
      await taskRepo.markTaskCompleted(id, body.output, body.filesModified, body.costUsd);
    } else {
      await taskRepo.markTaskFailed(id, body.error || body.output);
    }

    await projectRepo.updateTotalCost(existing.projectId);

    const task = await taskRepo.getTaskById(id);
    if (!task) {
      throw new Error("Failed to retrieve task after completion");
    }
    return task;
  }
}

export const agentService = new AgentService();
