import type { AgentTask, AgentTaskResult, CreateAgentTaskInput } from "../types/agent-task.js";

// GET /api/workstreams/:workstreamId/tasks
export interface ListAgentTasksResponse {
  tasks: AgentTask[];
}

// POST /api/tasks
export interface CreateAgentTaskRequest {
  body: CreateAgentTaskInput;
}
export interface CreateAgentTaskResponse {
  task: AgentTask;
}

// POST /api/tasks/:id/complete
export interface CompleteAgentTaskRequest {
  params: { id: string };
  body: AgentTaskResult;
}
