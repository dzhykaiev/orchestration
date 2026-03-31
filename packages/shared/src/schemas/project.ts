import { z } from "zod";
import { PaginationQuerySchema } from "./pagination.js";

export const projectStatusValues = [
  "draft",
  "planning",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
  "archived",
] as const;

export const providerValues = ["claude", "opencode"] as const;
export const projectModeValues = ["greenfield", "existing"] as const;

export const ProjectDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  name: z.string(),
  goal: z.string(),
  status: z.enum(projectStatusValues),
  architecture: z.string().nullable(),
  provider: z.enum(providerValues),
  totalCostUsd: z.string(),
  repoUrl: z.string().nullable(),
  repoPath: z.string().nullable(),
  projectMode: z.enum(projectModeValues),
  workBranch: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectDto = z.infer<typeof ProjectDtoSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  goal: z.string().min(1).max(5000),
  workspaceId: z.string().uuid(),
  provider: z.enum(providerValues).default("opencode"),
  repoUrl: z.string().url().optional(),
  repoPath: z.string().optional(),
  projectMode: z.enum(projectModeValues).default("greenfield"),
});

export const UpdateProjectSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  goal: z.string().min(1).max(5000).optional(),
  status: z.enum(projectStatusValues).optional(),
  architecture: z.string().optional(),
  provider: z.enum(providerValues).optional(),
});

export const ProjectIdParamSchema = z.object({
  id: z.string().uuid(),
});

export const ProjectListQuerySchema = PaginationQuerySchema.extend({
  includeArchived: z.coerce.boolean().default(false),
  status: z.enum(projectStatusValues).optional(),
  provider: z.enum(providerValues).optional(),
  workspaceId: z.string().uuid().optional(),
});
