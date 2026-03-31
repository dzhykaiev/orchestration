import { z } from "zod";
import { PaginationQuerySchema } from "./pagination.js";

export const auditActionValues = [
  "created",
  "updated",
  "status_changed",
  "delegated",
  "escalated",
  "reviewed",
  "completed",
  "failed",
] as const;

export const actorTypeValues = ["user", "agent", "system"] as const;

export const AuditLogDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  entityType: z.string(),
  entityId: z.string().uuid(),
  action: z.enum(auditActionValues),
  actorType: z.enum(actorTypeValues),
  actorId: z.string().nullable(),
  metadata: z.record(z.unknown()),
  createdAt: z.string(),
});

export type AuditLogDto = z.infer<typeof AuditLogDtoSchema>;

export const AuditLogListQuerySchema = PaginationQuerySchema;
