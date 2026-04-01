import type { CreateAuditLogInput } from "@orchestration/shared";

export interface AuditLogRecord {
  id: string;
  [key: string]: unknown;
}

export interface AuditLogRepositoryPort {
  createAuditLog(input: CreateAuditLogInput): Promise<AuditLogRecord | null>;
  listByEntity(
    entityType: string,
    entityId: string,
    opts: { limit: number; offset: number },
  ): Promise<{ data?: AuditLogRecord[]; logs?: AuditLogRecord[]; total: number }>;
  listByProject(
    projectId: string,
    opts: { limit: number; offset: number },
  ): Promise<{ data?: AuditLogRecord[]; logs?: AuditLogRecord[]; total: number }>;
}

export interface AuditLogsDependencies {
  auditLogRepo: AuditLogRepositoryPort;
}
