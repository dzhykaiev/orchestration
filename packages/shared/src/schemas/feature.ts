import { z } from "zod";

export const featureStatusValues = ["backlog", "todo", "in_progress", "done", "rejected"] as const;

export const featureTypeValues = ["feature", "bug", "improvement", "refactor"] as const;

export const FeatureDtoSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(featureStatusValues),
  type: z.enum(featureTypeValues),
  priority: z.number().int(),
  sortOrder: z.number().int(),
  orchestrationProjectId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeatureDto = z.infer<typeof FeatureDtoSchema>;

export const CreateFeatureSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(featureTypeValues).default("feature"),
  priority: z.number().int().min(0).max(3).default(0),
});

export const UpdateFeatureSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.enum(featureStatusValues).optional(),
  type: z.enum(featureTypeValues).optional(),
  priority: z.number().int().min(0).max(3).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const FeatureIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const FeatureListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
  offset: z.coerce.number().int().min(0).default(0),
  status: z.enum(featureStatusValues).optional(),
});

export const ReorderFeaturesSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ),
});
