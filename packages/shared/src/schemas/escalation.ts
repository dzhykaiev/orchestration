import { z } from "zod";
import { agentTierValues } from "./agent-task.js";

export const escalationStatusValues = ["open", "acknowledged", "resolved", "dismissed"] as const;

export const EscalationDtoSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  projectId: z.string().uuid(),
  fromTier: z.enum(agentTierValues),
  toTier: z.enum(agentTierValues),
  reason: z.string(),
  context: z.record(z.unknown()),
  status: z.enum(escalationStatusValues),
  resolution: z.string().nullable(),
  resolvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EscalationDto = z.infer<typeof EscalationDtoSchema>;

export const EscalationListQuerySchema = z.object({
  status: z.enum(escalationStatusValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
