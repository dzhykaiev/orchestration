import { z } from "zod";
import { agentTierValues } from "./agent-task.js";
import { PaginationQuerySchema } from "./pagination.js";

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

export const EscalationListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(escalationStatusValues).optional(),
});
