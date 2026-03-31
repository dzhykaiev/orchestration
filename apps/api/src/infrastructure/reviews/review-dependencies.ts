import { reviewRepo } from "@orchestration/db";
import type { ReviewsDependencies } from "../../application/reviews/ports.js";

export const defaultReviewsDependencies: ReviewsDependencies = {
  reviewRepo,
};
