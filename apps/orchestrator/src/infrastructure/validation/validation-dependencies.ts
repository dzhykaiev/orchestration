import {
  artifactRepo,
  auditLogRepo,
  projectRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import { WORKSTREAM_TRANSITIONS, canTransition, resolveProvider } from "@orchestration/shared";
import type { WorkstreamStatus } from "@orchestration/shared";
import type { ValidationDependencies } from "../../application/validation/ports.js";
import { eventBus } from "../../events/index.js";
import { createLLMProvider } from "../../llm/index.js";
import { AGENT_BRIEFS } from "../../prompts/briefs.js";
import { checkProjectCompletion, unblockDependents } from "../../tracking/progress.js";

export const defaultValidationDependencies: ValidationDependencies = {
  projectRepo,
  workstreamRepo,
  taskRepo,
  auditLogRepo,
  artifactRepo,
  createLLMProvider,
  resolveProvider,
  qaBrief: AGENT_BRIEFS.qa,
  eventBus,
  unblockDependents,
  checkProjectCompletion,
  canWorkstreamTransition(from: string, to: string): boolean {
    return canTransition(WORKSTREAM_TRANSITIONS, from as WorkstreamStatus, to as WorkstreamStatus);
  },
};
