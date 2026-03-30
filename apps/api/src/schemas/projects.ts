import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  goal: z.string().min(1).max(5000),
  provider: z.enum(["claude", "opencode"]).default("opencode"),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  goal: z.string().min(1).max(5000).optional(),
  status: z
    .enum(["draft", "planning", "in_progress", "completed", "failed", "archived"])
    .optional(),
  architecture: z.string().optional(),
  provider: z.enum(["claude", "opencode"]).optional(),
});

export const idParamSchema = z.object({
  id: z.string().uuid(),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  includeArchived: z.coerce.boolean().default(false),
});
