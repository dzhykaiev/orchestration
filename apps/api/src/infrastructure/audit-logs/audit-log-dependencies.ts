import { auditLogRepo } from "@orchestration/db";
import type { AuditLogsDependencies } from "../../application/audit-logs/ports.js";

export const defaultAuditLogsDependencies: AuditLogsDependencies = {
  auditLogRepo,
};
