import type { ValidationJobData } from "../application/validation/ports.js";
import { createValidationJobHandler } from "../application/validation/validation-use-cases.js";
import { defaultValidationDependencies } from "../infrastructure/validation/validation-dependencies.js";

export type { ValidationJobData };

export const handleValidationJob = createValidationJobHandler(defaultValidationDependencies);
