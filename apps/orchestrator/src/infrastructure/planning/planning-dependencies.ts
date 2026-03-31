import {
  artifactRepo,
  auditLogRepo,
  projectRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import type { PlanningDependencies } from "../../application/planning/ports.js";
import { eventBus } from "../../events/index.js";
import { createLLMProvider } from "../../llm/index.js";
import {
  ARCHITECT_EXISTING_CODEBASE_PROMPT,
  ARCHITECT_SYSTEM_PROMPT,
  parseArchitecture,
  parseWorkstreams,
} from "../../prompts/architect.js";
import { buildUserMessage } from "../../prompts/implementation.js";
import { implementationQueue } from "../../shared-resources.js";

export const defaultPlanningDependencies: PlanningDependencies = {
  projectRepo,
  workstreamRepo,
  taskRepo,
  artifactRepo,
  auditLogRepo,
  implementationQueue,
  eventBus,
  createLLMProvider,
  parseArchitecture,
  parseWorkstreams,
  buildUserMessage,
  architectPrompts: {
    existingCodebase: ARCHITECT_EXISTING_CODEBASE_PROMPT,
    greenfield: ARCHITECT_SYSTEM_PROMPT,
  },
};
