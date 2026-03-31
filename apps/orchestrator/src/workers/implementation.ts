import { createImplementationJobHandler } from "../application/implementation/implementation-use-cases.js";
import type { ImplementationJobData } from "../application/implementation/ports.js";
import { defaultImplementationDependencies } from "../infrastructure/implementation/implementation-dependencies.js";

export type { ImplementationJobData };

export const handleImplementationJob = createImplementationJobHandler(
  defaultImplementationDependencies,
);
