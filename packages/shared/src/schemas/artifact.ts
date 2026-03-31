import { z } from "zod";
import { PaginationQuerySchema } from "./pagination.js";

export const artifactTypeValues = [
  "code_diff",
  "test_result",
  "document",
  "architecture",
  "config",
  "log",
  "review_report",
] as const;

export const ArtifactDtoSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid().nullable(),
  workstreamId: z.string().uuid().nullable(),
  projectId: z.string().uuid(),
  type: z.enum(artifactTypeValues),
  name: z.string(),
  content: z.string(),
  metadata: z.record(z.unknown()),
  sizeBytes: z.number(),
  createdAt: z.string(),
});

export type ArtifactDto = z.infer<typeof ArtifactDtoSchema>;

export const ArtifactListQuerySchema = PaginationQuerySchema.extend({
  type: z.enum(artifactTypeValues).optional(),
});
