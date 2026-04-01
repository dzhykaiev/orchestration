import { z } from "zod";
import { PaginationQuerySchema } from "./pagination.js";

export const bootstrapAgentRoleValues = ["ceo", "orchestrator"] as const;
export const bootstrapAgentProviderValues = ["claude", "codex", "opencode"] as const;

export const WorkspaceDtoSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  description: z.string().nullable(),
  mission: z.string(),
  bootstrapAgentRole: z.enum(bootstrapAgentRoleValues),
  bootstrapAgentProvider: z.enum(bootstrapAgentProviderValues),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type WorkspaceDto = z.infer<typeof WorkspaceDtoSchema>;

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  description: z.string().max(2000).optional(),
  mission: z.string().min(1).max(5000).optional(),
  bootstrapAgentRole: z.enum(bootstrapAgentRoleValues).default("ceo"),
  bootstrapAgentProvider: z.enum(bootstrapAgentProviderValues).default("opencode"),
});

export const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  description: z.string().max(2000).optional(),
  mission: z.string().min(1).max(5000).optional(),
  bootstrapAgentRole: z.enum(bootstrapAgentRoleValues).optional(),
  bootstrapAgentProvider: z.enum(bootstrapAgentProviderValues).optional(),
});

export const WorkspaceIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const WorkspaceListQuerySchema = PaginationQuerySchema;
