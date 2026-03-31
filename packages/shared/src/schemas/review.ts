import { z } from "zod";
import { PaginationQuerySchema } from "./pagination.js";

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

export const ReviewListQuerySchema = PaginationQuerySchema;
