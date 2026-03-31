import type { AuditLogsDependencies } from "./ports.js";

export class AuditLogUseCases {
  constructor(private readonly deps: AuditLogsDependencies) {}

  async listByProject(projectId: string, query: { limit: number; offset: number }) {
    return this.deps.auditLogRepo.listByProject(projectId, query);
  }
}
