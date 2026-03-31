export type ReviewVerdict = "approved" | "changes_requested" | "rejected";

export interface Review {
  id: string;
  taskId: string;
  workstreamId: string;
  projectId: string;
  verdict: ReviewVerdict;
  feedback: string;
  requestedChanges: string[];
  iteration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewInput {
  taskId: string;
  workstreamId: string;
  projectId: string;
  verdict: ReviewVerdict;
  feedback: string;
  requestedChanges?: string[];
  iteration?: number;
}
