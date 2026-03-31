export interface AuditLogRecord {
  id: string;
  [key: string]: unknown;
}

export interface AuditLogRepositoryPort {
  listByProject(
    projectId: string,
    opts: { limit: number; offset: number },
  ): Promise<{ data?: AuditLogRecord[]; logs?: AuditLogRecord[]; total: number }>;
}

export interface AuditLogsDependencies {
  auditLogRepo: AuditLogRepositoryPort;
}
