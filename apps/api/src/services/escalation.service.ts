import { EscalationUseCases } from "../application/escalations/escalation-use-cases.js";
import type { EscalationsDependencies } from "../application/escalations/ports.js";
import { NotFoundError } from "../domain/common/errors.js";
import { defaultEscalationsDependencies } from "../infrastructure/escalations/escalation-dependencies.js";

export class EscalationService extends EscalationUseCases {
  constructor(deps: EscalationsDependencies = defaultEscalationsDependencies) {
    super(deps);
  }
}

export { NotFoundError };

export const escalationService = new EscalationService();
