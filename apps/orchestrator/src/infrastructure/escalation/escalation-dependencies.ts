import { escalationRepo, taskRepo } from "@orchestration/db";
import type { AgentRole } from "@orchestration/shared";
import type { EscalationDependencies } from "../../application/escalation/ports.js";
import { eventBus } from "../../events/index.js";
import { getParentTier, roleToTier } from "../../hierarchy/agent-router.js";
import { implementationQueue } from "../../shared-resources.js";

const TIER_TO_ESCALATION_ROLE: Record<string, AgentRole> = {
  ceo: "ceo",
  planner: "planner",
  architect: "architect",
  lead: "lead",
  specialist: "backend",
  reviewer: "reviewer",
};

export const defaultEscalationDependencies: EscalationDependencies = {
  taskRepo,
  escalationRepo,
  implementationQueue,
  eventBus,
  getParentTier,
  roleToTier,
  tierToEscalationRole: TIER_TO_ESCALATION_ROLE,
};
