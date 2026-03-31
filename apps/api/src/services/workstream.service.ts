import type { WorkstreamsDependencies } from "../application/workstreams/ports.js";
import {
  ValidationError,
  WorkstreamUseCases,
} from "../application/workstreams/workstream-use-cases.js";
import { defaultWorkstreamsDependencies } from "../infrastructure/workstreams/workstream-dependencies.js";

export class WorkstreamService extends WorkstreamUseCases {
  constructor(deps: WorkstreamsDependencies = defaultWorkstreamsDependencies) {
    super(deps);
  }
}

export { ValidationError };

export const workstreamService = new WorkstreamService();
