import { NotFoundError } from "../../domain/common/errors.js";
import type { EscalationsDependencies } from "./ports.js";

export class EscalationUseCases {
  constructor(private readonly deps: EscalationsDependencies) {}

  async listByProject(id: string, query: { limit: number; offset: number }) {
    return this.deps.escalationRepo.listByProject(id, query);
  }

  async resolve(id: string, resolution: string) {
    const escalation = await this.deps.escalationRepo.resolveEscalation(id, resolution);
    if (!escalation) {
      throw new NotFoundError("Escalation not found");
    }
    return escalation;
  }

  async dismiss(id: string) {
    const escalation = await this.deps.escalationRepo.dismissEscalation(id);
    if (!escalation) {
      throw new NotFoundError("Escalation not found");
    }
    return escalation;
  }
}
