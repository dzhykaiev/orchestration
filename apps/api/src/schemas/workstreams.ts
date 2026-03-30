import { z } from "zod";

export const updateWorkstreamSchema = z.object({
  status: z
    .enum(["pending", "blocked", "in_progress", "completed", "failed"])
    .optional(),
  assignedAgent: z.string().nullable().optional(),
  deliverables: z.array(z.string()).optional(),
});
