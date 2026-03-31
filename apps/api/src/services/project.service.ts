import type { Queue } from "bullmq";
import type { ProjectsDependencies } from "../application/projects/ports.js";
import { ProjectUseCases } from "../application/projects/project-use-cases.js";
import { BusinessError, NotFoundError } from "../domain/common/errors.js";
import { defaultProjectsDependencies } from "../infrastructure/projects/project-dependencies.js";

export class ProjectService extends ProjectUseCases {
  constructor(deps: ProjectsDependencies = defaultProjectsDependencies) {
    super(deps);
  }

  plan(id: string, planningQueue: Queue) {
    return super.plan(id, planningQueue);
  }

  stop(id: string, planningQueue: Queue, implementationQueue: Queue, validationQueue?: Queue) {
    return super.stop(id, planningQueue, implementationQueue, validationQueue);
  }
}

export { BusinessError, NotFoundError };

export const projectService = new ProjectService();
