export type ArtifactType =
  | "code_diff"
  | "test_result"
  | "document"
  | "architecture"
  | "config"
  | "log"
  | "review_report";

export interface Artifact {
  id: string;
  taskId: string | null;
  workstreamId: string | null;
  projectId: string;
  type: ArtifactType;
  name: string;
  content: string;
  metadata: Record<string, unknown>;
  sizeBytes: number;
  createdAt: Date;
}

export interface CreateArtifactInput {
  taskId?: string;
  workstreamId?: string;
  projectId: string;
  type: ArtifactType;
  name: string;
  content: string;
  metadata?: Record<string, unknown>;
}
