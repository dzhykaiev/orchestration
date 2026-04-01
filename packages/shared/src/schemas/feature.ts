import { z } from "zod";
import { PaginationQuerySchema } from "./pagination.js";

export const featureStatusValues = ["backlog", "todo", "in_progress", "done", "rejected"] as const;

export const featureTypeValues = ["feature", "bug", "improvement", "refactor"] as const;
export const featureAssigneeModeValues = ["orchestrator", "agent"] as const;

export const FeatureDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  title: z.string(),
  description: z.string().nullable(),
  status: z.enum(featureStatusValues),
  type: z.enum(featureTypeValues),
  priority: z.number().int(),
  sortOrder: z.number().int(),
  sourceProjectId: z.string().uuid().nullable(),
  assigneeMode: z.enum(featureAssigneeModeValues),
  assigneeAgentDefinitionId: z.string().uuid().nullable(),
  orchestrationProjectId: z.string().uuid().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type FeatureDto = z.infer<typeof FeatureDtoSchema>;

export const CreateFeatureSchema = z
  .object({
    workspaceId: z.string().uuid(),
    title: z.string().min(1).max(500),
    description: z.string().max(5000).optional(),
    type: z.enum(featureTypeValues).default("feature"),
    priority: z.number().int().min(0).max(3).default(0),
    sourceProjectId: z.string().uuid().optional(),
    assigneeMode: z.enum(featureAssigneeModeValues).default("orchestrator"),
    assigneeAgentDefinitionId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.assigneeMode === "orchestrator" && data.assigneeAgentDefinitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assigneeAgentDefinitionId"],
        message: "Must be empty when assigneeMode is orchestrator",
      });
    }
    if (data.assigneeMode === "agent" && !data.assigneeAgentDefinitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assigneeAgentDefinitionId"],
        message: "Required when assigneeMode is agent",
      });
    }
  });

export const UpdateFeatureSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(5000).optional(),
    status: z.enum(featureStatusValues).optional(),
    type: z.enum(featureTypeValues).optional(),
    priority: z.number().int().min(0).max(3).optional(),
    sortOrder: z.number().int().min(0).optional(),
    sourceProjectId: z.string().uuid().optional(),
    assigneeMode: z.enum(featureAssigneeModeValues).optional(),
    assigneeAgentDefinitionId: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.assigneeMode === "orchestrator" && data.assigneeAgentDefinitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assigneeAgentDefinitionId"],
        message: "Must be empty when assigneeMode is orchestrator",
      });
    }
    if (data.assigneeMode === "agent" && data.assigneeAgentDefinitionId === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["assigneeAgentDefinitionId"],
        message: "Cannot be null when assigneeMode is agent",
      });
    }
  });

export const FeatureIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const FeatureListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(featureStatusValues).optional(),
  type: z.enum(featureTypeValues).optional(),
  workspaceId: z.string().uuid().optional(),
  sourceProjectId: z.string().uuid().optional(),
  assigneeMode: z.enum(featureAssigneeModeValues).optional(),
  assigneeAgentDefinitionId: z.string().uuid().optional(),
});

export const ReorderFeaturesSchema = z.object({
  updates: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ),
});
