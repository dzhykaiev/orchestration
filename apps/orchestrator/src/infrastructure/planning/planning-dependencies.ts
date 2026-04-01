import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
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

const execFileAsync = promisify(execFile);
const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

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
  async resolveProjectDir(project) {
    const isExisting = project.projectMode === "existing";

    if (isExisting && project.repoPath) {
      return resolve(project.repoPath);
    }

    if (isExisting && project.repoUrl) {
      const projectDir = resolve(PROJECTS_DIR, project.id);
      await mkdir(projectDir, { recursive: true });
      await execFileAsync("git", ["clone", project.repoUrl, projectDir]);
      return projectDir;
    }

    const projectDir = resolve(PROJECTS_DIR, project.id);
    await mkdir(projectDir, { recursive: true });
    return projectDir;
  },
  async checkoutWorkBranch(projectDir, branchName) {
    await execFileAsync("git", ["-C", projectDir, "checkout", "-b", branchName]);
  },
};
