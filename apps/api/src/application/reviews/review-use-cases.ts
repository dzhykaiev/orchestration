import type { ReviewsDependencies } from "./ports.js";

export class ReviewUseCases {
  constructor(private readonly deps: ReviewsDependencies) {}

  async listByTask(taskId: string) {
    return this.deps.reviewRepo.listByTask(taskId);
  }

  async listByWorkstream(workstreamId: string, query: { limit: number; offset: number }) {
    return this.deps.reviewRepo.listByWorkstream(workstreamId, query);
  }
}
