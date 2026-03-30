import { z } from "zod";

export const createTaskSchema = z.object({
  workstreamId: z.string().uuid(),
  projectId: z.string().uuid(),
  role: z.enum(["architect", "backend", "frontend", "data", "devops", "qa"]),
  prompt: z.string().min(1),
  maxAttempts: z.number().int().min(1).max(10).optional(),
});

export const completeTaskSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  output: z.string(),
  filesModified: z.array(z.string()).default([]),
  error: z.string().optional(),
  costUsd: z.number().optional(),
});
