import {
  agentDefinitionRepo,
  artifactRepo,
  auditLogRepo,
  projectRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import type { ImplementationDependencies } from "../../application/implementation/ports.js";
import { handleDelegation } from "../../delegation/handler.js";
import { handleEscalation } from "../../escalation/handler.js";
import { eventBus } from "../../events/index.js";
import { diffSnapshots, snapshotFiles } from "../../llm/file-utils.js";
import { createLLMProvider } from "../../llm/index.js";
import { buildSystemPrompt } from "../../prompts/implementation.js";
import { implementationQueue } from "../../shared-resources.js";
import { checkWorkstreamCompletion, handleReviewerOutput } from "../../tracking/progress.js";

export const defaultImplementationDependencies: ImplementationDependencies = {
  projectRepo,
  workstreamRepo,
  taskRepo,
  auditLogRepo,
  artifactRepo,
  agentDefinitionRepo,
  eventBus,
  createLLMProvider,
  buildSystemPrompt,
  snapshotFiles,
  diffSnapshots,
  handleEscalation,
  handleDelegation,
  checkWorkstreamCompletion,
  handleReviewerOutput,
  implementationQueue,
};
