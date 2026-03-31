import { AuditLogUseCases } from "../application/audit-logs/audit-log-use-cases.js";
import type { AuditLogsDependencies } from "../application/audit-logs/ports.js";
import { defaultAuditLogsDependencies } from "../infrastructure/audit-logs/audit-log-dependencies.js";

export class AuditLogService extends AuditLogUseCases {
  constructor(deps: AuditLogsDependencies = defaultAuditLogsDependencies) {
    super(deps);
  }
}

export const auditLogService = new AuditLogService();
