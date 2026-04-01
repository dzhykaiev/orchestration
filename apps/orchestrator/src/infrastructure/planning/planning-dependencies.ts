import { execFile } from "node:child_process";
import { cp, mkdir, readdir, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
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
import { resolveCompanyProjectRoot } from "../../runtime/company-paths.js";
import { implementationQueue } from "../../shared-resources.js";

const execFileAsync = promisify(execFile);

const COPY_IGNORE = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "logs",
  "node_modules",
]);

async function isNonEmptyDirectory(path: string): Promise<boolean> {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) {
      return false;
    }
    const entries = await readdir(path);
    return entries.length > 0;
  } catch {
    return false;
  }
}

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
    const projectDir = resolveCompanyProjectRoot(project.workspaceId, project.id);
    await mkdir(projectDir, { recursive: true });

    const isExisting = project.projectMode === "existing";

    if (isExisting && project.repoUrl) {
      if (!(await isNonEmptyDirectory(projectDir))) {
        await execFileAsync("git", ["clone", project.repoUrl, projectDir]);
      }
      return projectDir;
    }

    if (isExisting && project.repoPath) {
      const sourcePath = resolve(project.repoPath);
      if (sourcePath !== projectDir && !(await isNonEmptyDirectory(projectDir))) {
        await cp(sourcePath, projectDir, {
          recursive: true,
          force: false,
          filter: (src) => !COPY_IGNORE.has(basename(src)),
        });
      }
      return projectDir;
    }

    return projectDir;
  },
  async checkoutWorkBranch(projectDir, branchName) {
    await execFileAsync("git", ["-C", projectDir, "checkout", "-b", branchName]);
  },
};
