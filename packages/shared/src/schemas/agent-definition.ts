import { z } from "zod";
import { agentRoleValues, agentTierValues } from "./agent-task.js";

export const AgentDefinitionDtoSchema = z.object({
  id: z.string().uuid(),
  workspaceId: z.string().uuid(),
  role: z.enum(agentRoleValues),
  tier: z.enum(agentTierValues),
  parentRole: z.enum(agentRoleValues).nullable(),
  name: z.string(),
  systemPrompt: z.string().nullable(),
  capabilities: z.array(z.string()),
  maxConcurrentTasks: z.number().int(),
  provider: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type AgentDefinitionDto = z.infer<typeof AgentDefinitionDtoSchema>;

export const CreateAgentDefinitionSchema = z.object({
  role: z.enum(agentRoleValues),
  tier: z.enum(agentTierValues),
  parentRole: z.enum(agentRoleValues).optional(),
  name: z.string().min(1).max(200),
  systemPrompt: z.string().max(10000).optional(),
  capabilities: z.array(z.string()).optional(),
  maxConcurrentTasks: z.number().int().min(1).max(10).optional(),
  provider: z.string().optional(),
});

export const UpdateAgentDefinitionSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  systemPrompt: z.string().max(10000).optional(),
  capabilities: z.array(z.string()).optional(),
  maxConcurrentTasks: z.number().int().min(1).max(10).optional(),
  provider: z.string().optional(),
  parentRole: z.enum(agentRoleValues).optional(),
});
