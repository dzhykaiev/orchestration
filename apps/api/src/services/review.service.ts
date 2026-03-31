import type { ReviewsDependencies } from "../application/reviews/ports.js";
import { ReviewUseCases } from "../application/reviews/review-use-cases.js";
import { defaultReviewsDependencies } from "../infrastructure/reviews/review-dependencies.js";

export class ReviewService extends ReviewUseCases {
  constructor(deps: ReviewsDependencies = defaultReviewsDependencies) {
    super(deps);
  }
}

export const reviewService = new ReviewService();
