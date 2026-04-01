import { CreateAgentDefinitionSchema, actorTypeValues } from "@orchestration/shared";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { BusinessError } from "../domain/common/errors.js";
import {
  createFeatureSchema,
  featureIdParamSchema,
  featureListQuerySchema,
  reorderFeaturesSchema,
  updateFeatureSchema,
} from "../schemas/features.js";
import { agentDefinitionService } from "../services/agent-definition.service.js";
import { auditLogService } from "../services/audit-log.service.js";
import { featureService } from "../services/feature.service.js";
import { ticketAutoRunner } from "../services/scheduler/ticket-auto-runner.js";

const ticketLogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

const ticketLogCreateSchema = z.object({
  message: z.string().min(1).max(5000),
  channel: z.enum(["comment", "question", "handoff", "note"]).default("comment"),
  actorType: z.enum(actorTypeValues).default("user"),
  actorId: z.string().min(1).max(200).optional(),
  projectId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const ticketHireSchema = CreateAgentDefinitionSchema.extend({
  createFollowupTicket: z.boolean().default(true),
  followupTitle: z.string().min(1).max(200).optional(),
  followupDescription: z.string().max(10_000).optional(),
  requestedByActorType: z.enum(actorTypeValues).default("agent"),
  requestedByActorId: z.string().min(1).max(200).optional(),
});

const runnerTickSchema = z.object({
  intervalMs: z.coerce.number().int().min(1000).max(3_600_000).optional(),
});

export const ticketRoutes: FastifyPluginAsync = async (app) => {
  // GET / — list tickets
  app.get("/", async (request) => {
    const query = featureListQuerySchema.parse(request.query);
    const result = await featureService.list(query);
    return { tickets: result.data, total: result.total, limit: query.limit, offset: query.offset };
  });

  // GET /runner/status — current 24/7 auto-runner status
  app.get("/runner/status", async () => {
    return { runner: ticketAutoRunner.getStatus() };
  });

  // POST /runner/start — start autonomous ticket runner loop
  app.post("/runner/start", async (request) => {
    const { intervalMs } = runnerTickSchema.parse(request.body ?? {});
    ticketAutoRunner.start(app.queues.planning, intervalMs);
    return { runner: ticketAutoRunner.getStatus() };
  });

  // POST /runner/stop — stop autonomous ticket runner loop
  app.post("/runner/stop", async () => {
    ticketAutoRunner.stop();
    return { runner: ticketAutoRunner.getStatus() };
  });

  // POST /runner/tick — execute one scheduler tick immediately
  app.post("/runner/tick", async () => {
    const result = await ticketAutoRunner.tick(app.queues.planning);
    return { result, runner: ticketAutoRunner.getStatus() };
  });

  // GET /:id — get ticket by ID
  app.get<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = featureIdParamSchema.parse(request.params);
    const ticket = await featureService.getById(id);
    return { ticket };
  });

  // POST / — create ticket
  app.post("/", async (request, reply) => {
    const body = createFeatureSchema.parse(request.body);
    const ticket = await featureService.create(body);
    return reply.status(201).send({ ticket });
  });

  // PATCH /reorder — bulk reorder tickets (must be before /:id)
  app.patch("/reorder", async (request) => {
    const { updates } = reorderFeaturesSchema.parse(request.body);
    await featureService.reorder(updates);
    return { ok: true };
  });

  // PATCH /:id — update ticket
  app.patch<{ Params: { id: string } }>("/:id", async (request) => {
    const { id } = featureIdParamSchema.parse(request.params);
    const body = updateFeatureSchema.parse(request.body);
    const ticket = await featureService.update(id, body);
    return { ticket };
  });

  // DELETE /:id — delete ticket
  app.delete<{ Params: { id: string } }>("/:id", async (request, reply) => {
    const { id } = featureIdParamSchema.parse(request.params);
    await featureService.delete(id);
    return reply.status(204).send();
  });

  // POST /:id/kickoff — convert ticket to orchestration project
  app.post<{ Params: { id: string } }>("/:id/kickoff", async (request) => {
    const { id } = featureIdParamSchema.parse(request.params);
    const result = await featureService.kickoff(id, app.queues.planning);
    return { ticket: result.feature, project: result.project };
  });

  // GET /:id/log — ticket communication/audit log
  app.get<{ Params: { id: string } }>("/:id/log", async (request) => {
    const { id } = featureIdParamSchema.parse(request.params);
    const query = ticketLogQuerySchema.parse(request.query);
    await featureService.getById(id);

    const result = await auditLogService.listByEntity("feature", id, query);
    return { logs: result.data ?? result.logs ?? [], total: result.total, limit: query.limit, offset: query.offset };
  });

  // POST /:id/log — append ticket communication entry
  app.post<{ Params: { id: string } }>("/:id/log", async (request, reply) => {
    const { id } = featureIdParamSchema.parse(request.params);
    const body = ticketLogCreateSchema.parse(request.body);
    const ticket = await featureService.getById(id);

    const log = await auditLogService.create({
      workspaceId: ticket.workspaceId ?? undefined,
      projectId: body.projectId ?? ticket.orchestrationProjectId ?? undefined,
      entityType: "feature",
      entityId: id,
      action: "updated",
      actorType: body.actorType,
      actorId: body.actorId,
      metadata: {
        kind: "message",
        channel: body.channel,
        message: body.message,
        ...(body.metadata ?? {}),
      },
    });

    return reply.status(201).send({ log });
  });

  // POST /:id/hire — hire an agent and optionally delegate a follow-up ticket
  app.post<{ Params: { id: string } }>("/:id/hire", async (request, reply) => {
    const { id } = featureIdParamSchema.parse(request.params);
    const body = ticketHireSchema.parse(request.body);
    const ticket = await featureService.getById(id);

    if (!ticket.workspaceId) {
      throw new BusinessError("Ticket must belong to a company before hiring");
    }

    const agent = await agentDefinitionService.create({
      workspaceId: ticket.workspaceId,
      role: body.role,
      tier: body.tier,
      parentRole: body.parentRole,
      name: body.name,
      systemPrompt: body.systemPrompt,
      capabilities: body.capabilities,
      maxConcurrentTasks: body.maxConcurrentTasks,
      provider: body.provider,
    });
    const hiredAgentId = String(agent.id);
    const hiredAgentName = typeof agent.name === "string" ? agent.name : "Agent";
    const hiredAgentRole = typeof agent.role === "string" ? agent.role : "unknown";

    let delegatedTicket = null;
    if (body.createFollowupTicket) {
      delegatedTicket = await featureService.create({
        workspaceId: ticket.workspaceId,
        title: body.followupTitle ?? `Delegated work for ${hiredAgentName}`,
        description:
          body.followupDescription ??
          `Follow-up delegated from ticket "${ticket.title}". Coordinate execution and report progress in ticket log.`,
        type: "improvement",
        sourceProjectId: ticket.orchestrationProjectId ?? undefined,
        assigneeMode: "agent",
        assigneeAgentDefinitionId: hiredAgentId,
      });
    }

    await auditLogService.create({
      workspaceId: ticket.workspaceId,
      projectId: ticket.orchestrationProjectId ?? undefined,
      entityType: "feature",
      entityId: id,
      action: "delegated",
      actorType: body.requestedByActorType,
      actorId: body.requestedByActorId,
      metadata: {
        kind: "hire",
        hiredAgentId,
        hiredAgentName,
        hiredAgentRole,
        delegatedTicketId: delegatedTicket?.id ?? null,
      },
    });

    return reply.status(201).send({ agent, delegatedTicket });
  });
};
