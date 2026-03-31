import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  auditLogRepo,
  featureRepo,
  projectRepo,
  reviewRepo,
  taskRepo,
  workstreamRepo,
} from "@orchestration/db";
import {
  FEATURE_TRANSITIONS,
  PROJECT_TRANSITIONS,
  WORKSTREAM_TRANSITIONS,
  canTransition,
  resolveProvider,
} from "@orchestration/shared";
import type { ProgressDependencies } from "../../application/progress/ports.js";
import { eventBus } from "../../events/index.js";
import { withLock } from "../../locking/index.js";
import { buildUserMessage } from "../../prompts/implementation.js";
import { implementationQueue, validationQueue } from "../../shared-resources.js";

const execFileAsync = promisify(execFile);

export const defaultProgressDependencies: ProgressDependencies = {
  workstreamRepo,
  taskRepo,
  projectRepo,
  featureRepo,
  auditLogRepo,
  reviewRepo,
  eventBus,
  implementationQueue,
  validationQueue,
  withLock: process.env.VITEST ? async (_key, fn) => fn() : withLock,
  buildUserMessage,
  resolveProvider,
  canTransition,
  transitions: {
    workstream: WORKSTREAM_TRANSITIONS,
    project: PROJECT_TRANSITIONS,
    feature: FEATURE_TRANSITIONS,
  },
  reviewVerdictPattern: /\b(APPROVED|CHANGES_REQUESTED|REJECTED)\b/,
  validationEnabled: process.env.VALIDATION_ENABLED === "true",
  projectsDir: resolve(process.env.PROJECTS_DIR || "./projects"),
  async runGit(projectDir: string, args: string[]) {
    await execFileAsync("git", ["-C", projectDir, ...args]);
  },
  defaultImplementationRole: "backend",
};
