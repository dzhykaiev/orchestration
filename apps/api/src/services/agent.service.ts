import type { Queue } from "bullmq";
import { AgentUseCases } from "../application/tasks/agent-use-cases.js";
import type { TasksDependencies } from "../application/tasks/ports.js";
import { BusinessError, NotFoundError } from "../domain/common/errors.js";
import { defaultTasksDependencies } from "../infrastructure/tasks/tasks-dependencies.js";

export class AgentService extends AgentUseCases {
  constructor(deps: TasksDependencies = defaultTasksDependencies) {
    super(deps);
  }

  create(input: Parameters<AgentUseCases["create"]>[0], implementationQueue: Queue) {
    return super.create(input, implementationQueue);
  }

  retry(id: string, implementationQueue: Queue) {
    return super.retry(id, implementationQueue);
  }
}

export { BusinessError, NotFoundError };

export const agentService = new AgentService();
