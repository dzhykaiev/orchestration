export type FeatureStatus = "backlog" | "todo" | "in_progress" | "done" | "rejected";
export type FeatureType = "feature" | "bug" | "improvement" | "refactor";

export interface Feature {
  id: string;
  workspaceId: string;
  title: string;
  description: string | null;
  status: FeatureStatus;
  type: FeatureType;
  priority: number;
  sortOrder: number;
  orchestrationProjectId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFeatureInput {
  workspaceId: string;
  title: string;
  description?: string;
  type?: FeatureType;
  priority?: number;
}

export interface UpdateFeatureInput {
  title?: string;
  description?: string;
  status?: FeatureStatus;
  type?: FeatureType;
  priority?: number;
  sortOrder?: number;
  orchestrationProjectId?: string;
}
