import { z } from "zod";

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

export const AuditLogListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
