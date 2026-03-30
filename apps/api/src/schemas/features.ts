import { z } from "zod";

export const createFeatureSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(["feature", "bug", "improvement", "refactor"]).default("feature"),
  priority: z.number().int().min(0).max(3).default(0),
});

export const updateFeatureSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(["backlog", "todo", "in_progress", "done", "rejected"]).optional(),
  type: z.enum(["feature", "bug", "improvement", "refactor"]).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const featureIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const featureListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(["backlog", "todo", "in_progress", "done", "rejected"]).optional(),
});

export const reorderFeaturesSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ),
});
