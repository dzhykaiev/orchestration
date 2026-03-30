import { z } from "zod";

export const createWorkstreamSchema = z.object({
  name: z.string().min(1).max(200),
  objective: z.string().min(1).max(5000),
  dependencies: z.array(z.string().uuid()).default([]),
  deliverables: z.array(z.string()).default([]),
  ownedPaths: z.array(z.string()).default([]),
  assignedAgent: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

export const updateWorkstreamSchema = z.object({
  status: z
    .enum(["pending", "blocked", "in_progress", "completed", "failed"])
    .optional(),
  assignedAgent: z.string().nullable().optional(),
  deliverables: z.array(z.string()).optional(),
  validationStatus: z.enum(["pass", "fail", "error"]).nullable().optional(),
  validationOutput: z.string().nullable().optional(),
});
