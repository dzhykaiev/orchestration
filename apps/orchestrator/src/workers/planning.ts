import { createPlanningJobHandler } from "../application/planning/planning-use-cases.js";
import type { PlanningJobData } from "../application/planning/ports.js";
import { defaultPlanningDependencies } from "../infrastructure/planning/planning-dependencies.js";

export type { PlanningJobData };

export const handlePlanningJob = createPlanningJobHandler(defaultPlanningDependencies);
