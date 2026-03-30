export type WorkstreamStatus = "pending" | "blocked" | "in_progress" | "completed" | "failed";

export interface Workstream {
  id: string;
  projectId: string;
  name: string;
  objective: string;
  status: WorkstreamStatus;
  dependencies: string[]; // workstream IDs this depends on
  assignedAgent: string | null;
  deliverables: string[];
  ownedPaths: string[];
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkstreamInput {
  projectId: string;
  name: string;
  objective: string;
  dependencies?: string[];
  deliverables?: string[];
  ownedPaths?: string[];
  order?: number;
}

export interface UpdateWorkstreamInput {
  status?: WorkstreamStatus;
  assignedAgent?: string | null;
  deliverables?: string[];
}
