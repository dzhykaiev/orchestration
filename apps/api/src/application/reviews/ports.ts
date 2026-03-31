export interface ReviewRecord {
  id: string;
  [key: string]: unknown;
}

export interface ReviewRepositoryPort {
  listByTask(taskId: string): Promise<ReviewRecord[]>;
  listByWorkstream(
    workstreamId: string,
    opts: { limit: number; offset: number },
  ): Promise<{ data: ReviewRecord[]; total: number }>;
}

export interface ReviewsDependencies {
  reviewRepo: ReviewRepositoryPort;
}
