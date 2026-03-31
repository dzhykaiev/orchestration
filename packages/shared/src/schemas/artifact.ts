import { z } from "zod";

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

export const ArtifactListQuerySchema = z.object({
  type: z.enum(artifactTypeValues).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
