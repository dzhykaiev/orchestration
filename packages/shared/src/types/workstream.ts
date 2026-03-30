export type WorkstreamStatus = "pending" | "blocked" | "in_progress" | "completed" | "failed";
export type ValidationStatus = "pass" | "fail" | "error";

export interface Workstream {
  id: string;
  projectId: string;
  name: string;
  objective: string;
  status: WorkstreamStatus;
  dependencies: string[];
  assignedAgent: string | null;
  deliverables: string[];
  ownedPaths: string[];
  order: number;
  validationStatus: ValidationStatus | null;
  validationOutput: string | null;
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
  assignedAgent?: string | null;
  order?: number;
}

export interface UpdateWorkstreamInput {
  status?: WorkstreamStatus;
  assignedAgent?: string | null;
  deliverables?: string[];
  validationStatus?: ValidationStatus | null;
  validationOutput?: string | null;
}
