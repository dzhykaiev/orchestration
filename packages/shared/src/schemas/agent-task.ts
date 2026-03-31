import { z } from "zod";

export const agentTaskStatusValues = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export const agentRoleValues = [
  "architect",
  "backend",
  "frontend",
  "data",
  "devops",
  "qa",
] as const;

export const AgentTaskDtoSchema = z.object({
  id: z.string().uuid(),
  workstreamId: z.string().uuid(),
  projectId: z.string().uuid(),
  role: z.enum(agentRoleValues),
  prompt: z.string(),
  status: z.enum(agentTaskStatusValues),
  output: z.string().nullable(),
  filesModified: z.array(z.string()),
  error: z.string().nullable(),
  costUsd: z.string(),
  attempts: z.number().int(),
  maxAttempts: z.number().int(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AgentTaskDto = z.infer<typeof AgentTaskDtoSchema>;

export const CreateAgentTaskSchema = z.object({
  workstreamId: z.string().uuid(),
  projectId: z.string().uuid(),
  role: z.enum(agentRoleValues),
  prompt: z.string().min(1),
  maxAttempts: z.number().int().min(1).max(10).optional(),
});

export const CompleteAgentTaskSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["completed", "failed"]),
  output: z.string(),
  filesModified: z.array(z.string()).default([]),
  error: z.string().optional(),
  costUsd: z.number().optional(),
});
