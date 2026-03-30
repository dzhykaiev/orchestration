import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { projectRepo, taskRepo, workstreamRepo } from "@orchestration/db";
import type { AgentRole } from "@orchestration/shared";
import type { Job } from "bullmq";
import { eventBus } from "../events/index.js";
import { createLLMProvider } from "../llm/index.js";
import {
  ARCHITECT_EXISTING_CODEBASE_PROMPT,
  ARCHITECT_SYSTEM_PROMPT,
  parseArchitecture,
  parseWorkstreams,
} from "../prompts/architect.js";
import { buildUserMessage } from "../prompts/implementation.js";
import { implementationQueue } from "../shared-resources.js";

const execFileAsync = promisify(execFile);

const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

interface PlanningJobData {
  projectId: string;
  goal: string;
  provider?: string;
}

/**
 * Detect circular dependencies in workstream definitions.
 * Returns the cycle path if found, or null if no cycles.
 */
function detectCircularDeps(
  workstreamDefs: Array<{ name: string; dependencies: string[] }>,
): string[] | null {
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const depsMap = new Map(workstreamDefs.map((ws) => [ws.name, ws.dependencies]));

  function dfs(name: string, path: string[]): string[] | null {
    if (inStack.has(name)) return [...path, name];
    if (visited.has(name)) return null;

    visited.add(name);
    inStack.add(name);

    for (const dep of depsMap.get(name) ?? []) {
      const cycle = dfs(dep, [...path, name]);
      if (cycle) return cycle;
    }

    inStack.delete(name);
    return null;
  }

  for (const ws of workstreamDefs) {
    const cycle = dfs(ws.name, []);
    if (cycle) return cycle;
  }
  return null;
}

export async function handlePlanningJob(job: Job<PlanningJobData>) {
  const { projectId, goal, provider } = job.data;
  console.log(`[Planning] Project ${projectId} with ${provider || "default"} provider: ${goal}`);

  try {
    // 1. Resolve project directory based on project mode
    const project = await projectRepo.getProjectById(projectId);
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const isExisting = project.projectMode === "existing";
    let projectDir: string;

    if (isExisting && project.repoPath) {
      projectDir = resolve(project.repoPath);
    } else if (isExisting && project.repoUrl) {
      projectDir = resolve(PROJECTS_DIR, projectId);
      await mkdir(projectDir, { recursive: true });
      await execFileAsync("git", ["clone", project.repoUrl, projectDir]);
    } else {
      projectDir = resolve(PROJECTS_DIR, projectId);
      await mkdir(projectDir, { recursive: true });
    }

    // Create work branch for existing repos
    if (isExisting) {
      const branchName = `orchestration/${projectId.slice(0, 8)}`;
      try {
        await execFileAsync("git", ["-C", projectDir, "checkout", "-b", branchName]);
        await projectRepo.updateProject(projectId, { workBranch: branchName });
      } catch (err) {
        console.warn(`[Planning] Could not create branch ${branchName}:`, err);
      }
    }

    // 2. Update project status
    await projectRepo.updateProject(projectId, { status: "planning" });
    eventBus.emitTyped("project.planning_started", { projectId });

    // 3. Create LLM provider for architect role
    const llmProvider = createLLMProvider("architect", provider);

    // 4. Run architect agent
    const systemPrompt = isExisting ? ARCHITECT_EXISTING_CODEBASE_PROMPT : ARCHITECT_SYSTEM_PROMPT;
    const prompt = isExisting
      ? `Project goal: ${goal}\n\nAnalyze the existing codebase in this directory, then plan the changes needed to achieve this goal.`
      : `Project goal: ${goal}\n\nScaffold the project and create the initial architecture. Then output the workstream plan.`;
    const { result } = await llmProvider.run({
      prompt,
      systemPrompt,
      cwd: projectDir,
    });

    if (!result || result.trim().length === 0) {
      throw new Error("Architect returned empty response");
    }

    console.log(`[Planning] Architect finished for ${projectId}`);

    // 5. Parse architecture and workstreams from result
    const architecture = parseArchitecture(result);

    let workstreamDefs: ReturnType<typeof parseWorkstreams>;
    try {
      workstreamDefs = parseWorkstreams(result);
    } catch (parseErr) {
      // If parsing failed due to malformed JSON (not missing block), log and fail
      const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
      if (errMsg.includes("JSON")) {
        console.error(`[Planning] Malformed workstreams JSON for project ${projectId}:`, errMsg);
        throw new Error(`Failed to parse workstreams from architect response: ${errMsg}`);
      }
      // Architect completed the whole project without needing workstreams
      console.log("[Planning] No workstreams block — architect completed the project directly");
      const createdFiles = await llmProvider.listFiles(projectDir);
      const relativeFiles = createdFiles.map((f) => f.replace(`${projectDir}/`, ""));
      console.log(`[Planning] Architect created ${relativeFiles.length} files:`, relativeFiles);
      await projectRepo.updateProject(projectId, {
        architecture: architecture || result,
        status: "completed",
      });
      return { projectId, workstreamCount: 0, filesCreated: relativeFiles.length };
    }

    // 5b. Validate workstream definitions
    if (workstreamDefs.length === 0) {
      console.warn(
        "[Planning] Architect returned empty workstreams array, treating as direct completion",
      );
      await projectRepo.updateProject(projectId, {
        architecture: architecture || result,
        status: "completed",
      });
      return { projectId, workstreamCount: 0, filesCreated: 0 };
    }

    // 5c. Detect circular dependencies
    const cycle = detectCircularDeps(workstreamDefs);
    if (cycle) {
      console.error(`[Planning] Circular dependency detected: ${cycle.join(" -> ")}`);
      // Remove circular deps to prevent deadlock — make them independent
      const cycleSet = new Set(cycle);
      for (const ws of workstreamDefs) {
        if (cycleSet.has(ws.name)) {
          console.warn(`[Planning] Removing dependencies from "${ws.name}" to break cycle`);
          ws.dependencies = ws.dependencies.filter((d) => !cycleSet.has(d));
        }
      }
    }

    // 6. Track files created by architect
    const createdFiles = await llmProvider.listFiles(projectDir);
    const relativeFiles = createdFiles.map((f) => f.replace(`${projectDir}/`, ""));
    console.log(`[Planning] Architect created ${relativeFiles.length} files:`, relativeFiles);

    // 7. Store architecture on project
    await projectRepo.updateProject(projectId, { architecture });

    // 8. Create workstreams in DB
    const createdWorkstreams = [];
    for (const wsDef of workstreamDefs) {
      const ws = await workstreamRepo.createWorkstream({
        projectId,
        name: wsDef.name,
        objective: wsDef.objective,
        dependencies: wsDef.dependencies,
        deliverables: wsDef.deliverables,
        ownedPaths: wsDef.ownedPaths,
        assignedAgent: wsDef.assignedAgent,
        order: wsDef.order,
      });
      if (!ws) {
        console.warn(`[Planning] Failed to create workstream: ${wsDef.name}`);
        continue;
      }
      createdWorkstreams.push(ws);
    }

    if (createdWorkstreams.length === 0) {
      console.error(`[Planning] No workstreams were created for project ${projectId}`);
      await projectRepo.updateProject(projectId, { status: "failed" });
      eventBus.emitTyped("project.failed", { projectId, error: "No workstreams could be created" });
      return { projectId, workstreamCount: 0, filesCreated: relativeFiles.length };
    }

    // 9. Build name-to-id map
    const nameToId = new Map(createdWorkstreams.map((ws) => [ws.name, ws.id]));

    // 10. Dispatch tasks for workstreams with no dependencies
    for (const ws of createdWorkstreams) {
      const deps = ws.dependencies as string[];
      const hasDeps = deps.length > 0;

      if (!hasDeps) {
        await workstreamRepo.updateWorkstream(ws.id, { status: "in_progress" });

        const role = (ws.assignedAgent as AgentRole) || "backend";
        const task = await taskRepo.createTask({
          workstreamId: ws.id,
          projectId,
          role,
          prompt: buildUserMessage(`Implement the ${ws.name} workstream: ${ws.objective}`, ws),
        });

        if (!task) {
          console.warn(`[Planning] Failed to create task for workstream: ${ws.name}`);
          continue;
        }

        await implementationQueue.add("implement", {
          taskId: task.id,
          workstreamId: ws.id,
          projectId,
          role: task.role,
          prompt: task.prompt,
          provider,
        });

        eventBus.emitTyped("workstream.started", { workstreamId: ws.id, projectId });
        eventBus.emitTyped("task.queued", { taskId: task.id, workstreamId: ws.id });
      }
    }

    // 11. Update project status
    await projectRepo.updateProject(projectId, { status: "in_progress" });
    eventBus.emitTyped("project.planning_completed", {
      projectId,
      workstreamIds: createdWorkstreams.map((ws) => ws.id),
    });

    return {
      projectId,
      workstreamCount: createdWorkstreams.length,
      filesCreated: relativeFiles.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Planning] Project ${projectId} failed:`, errorMessage);

    // Mark project as failed so it doesn't stay stuck in "planning"
    try {
      await projectRepo.updateProject(projectId, { status: "failed" });
      eventBus.emitTyped("project.failed", { projectId, error: errorMessage });
    } catch (updateErr) {
      console.error("[Planning] Failed to update project status:", updateErr);
    }

    // Re-throw so BullMQ marks the job as failed
    throw error;
  }
}
