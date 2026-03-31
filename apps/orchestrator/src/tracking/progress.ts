import { createProgressService } from "../application/progress/progress-use-cases.js";
import { defaultProgressDependencies } from "../infrastructure/progress/progress-dependencies.js";

const progressService = createProgressService(defaultProgressDependencies);

export const checkWorkstreamCompletion = progressService.checkWorkstreamCompletion;
export const unblockDependents = progressService.unblockDependents;
export const checkProjectCompletion = progressService.checkProjectCompletion;
export const handleReviewerOutput = progressService.handleReviewerOutput;
