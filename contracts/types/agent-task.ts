export type AgentTaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AgentRole = "architect" | "backend" | "frontend" | "data" | "devops" | "qa";

export interface AgentTask {
  id: string;
  workstreamId: string;
  projectId: string;
  role: AgentRole;
  prompt: string;
  status: AgentTaskStatus;
  output?: string; // agent's response/output
  filesModified: string[];
  error?: string;
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
