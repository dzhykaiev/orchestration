import { agentDefinitionRepo } from "@orchestration/db";
import {
  CreateAgentDefinitionSchema,
  UpdateAgentDefinitionSchema,
  WorkspaceIdParamSchema,
} from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { NotFoundError } from "../domain/common/errors.js";

const idParam = z.object({ id: z.string().uuid() });

export const workspaceAgentRoutes: FastifyPluginAsync = async (app) => {
  // GET /api/workspaces/:id/agents — list agent definitions for workspace
  app.get<{ Params: { id: string } }>("/:id/agents", async (request) => {
    const { id } = WorkspaceIdParamSchema.parse(request.params);
    const agents = await agentDefinitionRepo.listByWorkspace(id);
    return { agents };
  });

  // POST /api/workspaces/:id/agents — create agent definition
  app.post<{ Params: { id: string } }>("/:id/agents", async (request, reply) => {
    const { id } = WorkspaceIdParamSchema.parse(request.params);
    const body = CreateAgentDefinitionSchema.parse(request.body);
    const agent = await agentDefinitionRepo.createAgentDefinition({ ...body, workspaceId: id });
    return reply.status(201).send({ agent });
  });
};

export const agentDefinitionRoutes: FastifyPluginAsync = async (app) => {
  // PATCH /api/agents/:id — update agent definition
  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = idParam.parse(request.params);
    const body = UpdateAgentDefinitionSchema.parse(request.body);
    const agent = await agentDefinitionRepo.updateAgentDefinition(id, body);
    if (!agent) throw new NotFoundError("Agent definition not found");
    return { agent };
  });

  // DELETE /api/agents/:id — delete agent definition
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = idParam.parse(request.params);
    const agent = await agentDefinitionRepo.getById(id);
    if (!agent) throw new NotFoundError("Agent definition not found");
    await agentDefinitionRepo.deleteAgentDefinition(id);
    return reply.status(204).send();
  });
};
