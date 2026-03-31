import { z } from "zod";

export const reviewVerdictValues = ["approved", "changes_requested", "rejected"] as const;

export const ReviewDtoSchema = z.object({
  id: z.string().uuid(),
  taskId: z.string().uuid(),
  workstreamId: z.string().uuid(),
  projectId: z.string().uuid(),
  verdict: z.enum(reviewVerdictValues),
  feedback: z.string(),
  requestedChanges: z.array(z.string()),
  iteration: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ReviewDto = z.infer<typeof ReviewDtoSchema>;

export const ReviewListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
