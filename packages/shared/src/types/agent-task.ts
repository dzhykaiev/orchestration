export type AgentTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AgentRole =
  | "ceo"
  | "planner"
  | "architect"
  | "lead"
  | "backend"
  | "frontend"
  | "data"
  | "devops"
  | "qa"
  | "reviewer";
export type AgentTier = "ceo" | "planner" | "architect" | "lead" | "specialist" | "reviewer";

export interface AgentTask {
  id: string;
  workstreamId: string;
  projectId: string;
  role: AgentRole;
  tier?: AgentTier | null;
  parentTaskId?: string | null;
  rootTaskId?: string | null;
  depth: number;
  prompt: string;
  status: AgentTaskStatus;
  output?: string;
  filesModified: string[];
  error?: string;
  costUsd: string;
  attempts: number;
  maxAttempts: number;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAgentTaskInput {
  workstreamId: string;
  projectId: string;
  role: AgentRole;
  tier?: AgentTier;
  parentTaskId?: string;
  prompt: string;
  maxAttempts?: number;
}

export interface AgentTaskResult {
  taskId: string;
  status: "completed" | "failed";
  output: string;
  filesModified: string[];
  error?: string;
}
