import type { CreateAgentTaskInput } from "@orchestration/shared";
import { BusinessError, NotFoundError } from "../../domain/common/errors.js";
import type { ImplementationQueuePort, TasksDependencies } from "./ports.js";

export class AgentUseCases {
  constructor(private readonly deps: TasksDependencies) {}

  async create(input: CreateAgentTaskInput, implementationQueue: ImplementationQueuePort) {
    const task = await this.deps.taskRepo.createTask(input);
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

  async retry(id: string, implementationQueue: ImplementationQueuePort) {
    const existing = await this.deps.taskRepo.getTaskById(id);
    if (!existing) {
      throw new NotFoundError("Task not found");
    }

    if (existing.status !== "failed") {
      throw new BusinessError("Only failed tasks can be retried");
    }

    const task = await this.deps.taskRepo.retryTask(id);
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
    const existing = await this.deps.taskRepo.getTaskById(id);
    if (!existing) {
      throw new NotFoundError("Task not found");
    }

    if (body.status === "completed") {
      await this.deps.taskRepo.markTaskCompleted(id, body.output, body.filesModified, body.costUsd);
    } else {
      await this.deps.taskRepo.markTaskFailed(id, body.error || body.output);
    }

    await this.deps.projectRepo.updateTotalCost(existing.projectId);

    const task = await this.deps.taskRepo.getTaskById(id);
    if (!task) {
      throw new Error("Failed to retrieve task after completion");
    }
    return task;
  }

  async listChildren(parentTaskId: string) {
    return this.deps.taskRepo.listChildTasks(parentTaskId);
  }

  async getTree(rootTaskId: string) {
    return this.deps.taskRepo.getTaskTree(rootTaskId);
  }
}
