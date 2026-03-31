import { z } from "zod";

export const workstreamStatusValues = [
  "pending",
  "blocked",
  "in_progress",
  "completed",
  "failed",
] as const;

export const validationStatusValues = ["pass", "fail", "error"] as const;

export const WorkstreamDtoSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  name: z.string(),
  objective: z.string(),
  status: z.enum(workstreamStatusValues),
  dependencies: z.array(z.string()),
  assignedAgent: z.string().nullable(),
  deliverables: z.array(z.string()),
  ownedPaths: z.array(z.string()),
  order: z.number().int(),
  validationStatus: z.enum(validationStatusValues).nullable(),
  validationOutput: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkstreamDto = z.infer<typeof WorkstreamDtoSchema>;

export const CreateWorkstreamSchema = z.object({
  name: z.string().min(1).max(200),
  objective: z.string().min(1).max(5000),
  dependencies: z.array(z.string().uuid()).default([]),
  deliverables: z.array(z.string()).default([]),
  ownedPaths: z.array(z.string()).default([]),
  assignedAgent: z.string().nullable().optional(),
  order: z.number().int().min(0).optional(),
});

export const UpdateWorkstreamSchema = z.object({
  status: z.enum(workstreamStatusValues).optional(),
  assignedAgent: z.string().nullable().optional(),
  deliverables: z.array(z.string()).optional(),
  validationStatus: z.enum(validationStatusValues).nullable().optional(),
  validationOutput: z.string().nullable().optional(),
});
