import type { CreateAuditLogInput } from "@orchestration/shared";
import type { AuditLogsDependencies } from "./ports.js";

export class AuditLogUseCases {
  constructor(private readonly deps: AuditLogsDependencies) {}

  async create(input: CreateAuditLogInput) {
    return this.deps.auditLogRepo.createAuditLog(input);
  }

  async listByEntity(entityType: string, entityId: string, query: { limit: number; offset: number }) {
    return this.deps.auditLogRepo.listByEntity(entityType, entityId, query);
  }

  async listByProject(projectId: string, query: { limit: number; offset: number }) {
    return this.deps.auditLogRepo.listByProject(projectId, query);
  }
}
