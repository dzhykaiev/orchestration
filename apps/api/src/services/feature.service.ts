import type { Queue } from "bullmq";
import { FeatureUseCases } from "../application/features/feature-use-cases.js";
import type { FeaturesDependencies } from "../application/features/ports.js";
import { BusinessError, NotFoundError } from "../domain/common/errors.js";
import { getDefaultFeaturesDependencies } from "../infrastructure/features/feature-dependencies.js";

export class FeatureService extends FeatureUseCases {
  constructor(deps: FeaturesDependencies = getDefaultFeaturesDependencies()) {
    super(deps);
  }

  kickoff(id: string, planningQueue: Queue) {
    return super.kickoff(id, planningQueue);
  }
}

export { BusinessError, NotFoundError };

export const featureService = new FeatureService();
