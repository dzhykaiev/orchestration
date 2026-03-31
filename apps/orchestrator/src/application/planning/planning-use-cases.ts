import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  type AgentRole,
  PROJECT_TRANSITIONS,
  type ProjectStatus,
  WORKSTREAM_TRANSITIONS,
  type WorkstreamStatus,
  canTransition,
} from "@orchestration/shared";
import type {
  PlanningDependencies,
  PlanningJobData,
  PlanningJobHandler,
  PlanningWorkstream,
  PlanningWorkstreamDefinition,
} from "./ports.js";

const execFileAsync = promisify(execFile);
const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

function detectCircularDeps(workstreamDefs: PlanningWorkstreamDefinition[]): string[] | null {
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

function toRelativeFiles(files: string[], projectDir: string): string[] {
  const prefix = `${projectDir}/`;
  return files.map((file) => file.replace(prefix, ""));
}

function canProjectTransition(from: string, to: ProjectStatus): boolean {
  return canTransition(PROJECT_TRANSITIONS, from as ProjectStatus, to);
}

function canWorkstreamTransition(from: string, to: WorkstreamStatus): boolean {
  return canTransition(WORKSTREAM_TRANSITIONS, from as WorkstreamStatus, to);
}

async function resolveProjectDir(project: {
  id: string;
  projectMode?: string | null;
  repoPath?: string | null;
  repoUrl?: string | null;
}): Promise<string> {
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
}

async function tryCreateWorkBranch(
  deps: PlanningDependencies,
  projectId: string,
  projectDir: string,
  isExisting: boolean,
): Promise<void> {
  if (!isExisting) {
    return;
  }

  const branchName = `orchestration/${projectId.slice(0, 8)}`;
  try {
    await execFileAsync("git", ["-C", projectDir, "checkout", "-b", branchName]);
    await deps.projectRepo.updateProject(projectId, { workBranch: branchName });
  } catch (err) {
    console.warn(`[Planning] Could not create branch ${branchName}:`, err);
  }
}

async function createInitialWorkstreamTasks(
  deps: PlanningDependencies,
  input: {
    createdWorkstreams: PlanningWorkstream[];
    projectId: string;
    provider?: string;
  },
): Promise<void> {
  for (const workstream of input.createdWorkstreams) {
    const depsList = workstream.dependencies as string[];
    if (depsList.length > 0) {
      continue;
    }

    const getWorkstreamById = (
      deps.workstreamRepo as {
        getWorkstreamById?: (workstreamId: string) => Promise<PlanningWorkstream | null>;
      }
    ).getWorkstreamById;

    const forTransition = getWorkstreamById ? await getWorkstreamById(workstream.id) : workstream;
    if (!forTransition || !canWorkstreamTransition(forTransition.status, "in_progress")) {
      console.warn(
        `[Planning] Cannot transition workstream ${workstream.id} to in_progress, skipping dispatch`,
      );
      continue;
    }

    await deps.workstreamRepo.updateWorkstream(workstream.id, { status: "in_progress" });

    const role = (workstream.assignedAgent as AgentRole) || "backend";
    const task = await deps.taskRepo.createTask({
      workstreamId: workstream.id,
      projectId: input.projectId,
      role,
      prompt: deps.buildUserMessage(
        `Implement the ${workstream.name} workstream: ${workstream.objective}`,
        workstream,
      ),
    });

    if (!task) {
      console.warn(`[Planning] Failed to create task for workstream: ${workstream.name}`);
      continue;
    }

    await deps.implementationQueue.add(
      "implement",
      {
        taskId: task.id,
        workstreamId: workstream.id,
        projectId: input.projectId,
        role: task.role,
        prompt: task.prompt,
        provider: input.provider,
      },
      { jobId: `plan-${workstream.id}` },
    );

    deps.eventBus.emitTyped("workstream.started", {
      workstreamId: workstream.id,
      projectId: input.projectId,
    });
    deps.eventBus.emitTyped("task.queued", {
      taskId: task.id,
      workstreamId: workstream.id,
    });
  }
}

export function createPlanningJobHandler(deps: PlanningDependencies): PlanningJobHandler {
  return async (job: { data: PlanningJobData }) => {
    const { projectId, goal, provider } = job.data;
    console.log(`[Planning] Project ${projectId} with ${provider || "default"} provider: ${goal}`);

    try {
      const project = await deps.projectRepo.getProjectById(projectId);
      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      const isExisting = project.projectMode === "existing";
      const projectDir = await resolveProjectDir(project);

      await tryCreateWorkBranch(deps, projectId, projectDir, isExisting);

      const currentProject = await deps.projectRepo.getProjectById(projectId);
      if (currentProject && canProjectTransition(currentProject.status, "planning")) {
        await deps.projectRepo.updateProject(projectId, { status: "planning" });
      }
      deps.eventBus.emitTyped("project.planning_started", { projectId });

      const llmProvider = deps.createLLMProvider("architect", provider);
      const systemPrompt = isExisting
        ? deps.architectPrompts.existingCodebase
        : deps.architectPrompts.greenfield;

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

      const architecture = deps.parseArchitecture(result);

      let workstreamDefs: PlanningWorkstreamDefinition[];
      try {
        workstreamDefs = deps.parseWorkstreams(result);
      } catch (parseErr) {
        const errMsg = parseErr instanceof Error ? parseErr.message : String(parseErr);
        if (errMsg.includes("JSON")) {
          console.error(`[Planning] Malformed workstreams JSON for project ${projectId}:`, errMsg);
          throw new Error(`Failed to parse workstreams from architect response: ${errMsg}`);
        }

        console.log("[Planning] No workstreams block — architect completed the project directly");
        const createdFiles = await llmProvider.listFiles(projectDir);
        const relativeFiles = toRelativeFiles(createdFiles, projectDir);
        console.log(`[Planning] Architect created ${relativeFiles.length} files:`, relativeFiles);

        await deps.projectRepo.updateProject(projectId, {
          architecture: architecture || result,
          status: "completed",
        });

        return { projectId, workstreamCount: 0, filesCreated: relativeFiles.length };
      }

      if (workstreamDefs.length === 0) {
        console.warn(
          "[Planning] Architect returned empty workstreams array, treating as direct completion",
        );
        await deps.projectRepo.updateProject(projectId, {
          architecture: architecture || result,
          status: "completed",
        });
        return { projectId, workstreamCount: 0, filesCreated: 0 };
      }

      const cycle = detectCircularDeps(workstreamDefs);
      if (cycle) {
        console.error(`[Planning] Circular dependency detected: ${cycle.join(" -> ")}`);
        const cycleSet = new Set(cycle);
        for (const ws of workstreamDefs) {
          if (cycleSet.has(ws.name)) {
            console.warn(`[Planning] Removing dependencies from "${ws.name}" to break cycle`);
            ws.dependencies = ws.dependencies.filter((dep) => !cycleSet.has(dep));
          }
        }
      }

      const createdFiles = await llmProvider.listFiles(projectDir);
      const relativeFiles = toRelativeFiles(createdFiles, projectDir);
      console.log(`[Planning] Architect created ${relativeFiles.length} files:`, relativeFiles);

      await deps.projectRepo.updateProject(projectId, { architecture });

      try {
        await deps.artifactRepo.createArtifact({
          projectId,
          type: "architecture",
          name: "Architecture Document",
          content: architecture || result,
        });
      } catch (err) {
        console.warn("[Planning] Failed to create architecture artifact:", err);
      }

      try {
        await deps.artifactRepo.createArtifact({
          projectId,
          type: "document",
          name: "Planning Output",
          content: result,
        });
      } catch (err) {
        console.warn("[Planning] Failed to create planning output artifact:", err);
      }

      const createdWorkstreams: PlanningWorkstream[] = [];
      for (const wsDef of workstreamDefs) {
        const ws = await deps.workstreamRepo.createWorkstream({
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

        try {
          await deps.auditLogRepo.createAuditLog({
            projectId,
            entityType: "workstream",
            entityId: ws.id,
            action: "created",
            actorType: "agent",
            actorId: "architect",
          });
        } catch (err) {
          console.warn("[Planning] Failed to create audit log for workstream:", err);
        }
      }

      if (createdWorkstreams.length === 0) {
        console.error(`[Planning] No workstreams were created for project ${projectId}`);
        await deps.projectRepo.updateProject(projectId, { status: "failed" });
        deps.eventBus.emitTyped("project.failed", {
          projectId,
          error: "No workstreams could be created",
        });
        return { projectId, workstreamCount: 0, filesCreated: relativeFiles.length };
      }

      const nameToId = new Map(createdWorkstreams.map((ws) => [ws.name, ws.id]));
      for (const ws of createdWorkstreams) {
        const depsList = ws.dependencies as string[];
        if (depsList.length === 0) {
          continue;
        }

        const normalizedDeps = depsList.map((dep) => {
          const resolvedId = nameToId.get(dep);
          if (resolvedId) {
            return resolvedId;
          }
          if (!dep.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
            console.warn(
              `[Planning] Unknown dependency "${dep}" in workstream "${ws.name}" — keeping as-is`,
            );
          }
          return dep;
        });

        await deps.workstreamRepo.updateWorkstream(ws.id, { dependencies: normalizedDeps });
        ws.dependencies = normalizedDeps;
      }

      await createInitialWorkstreamTasks(deps, {
        createdWorkstreams,
        projectId,
        provider,
      });

      await deps.projectRepo.updateProject(projectId, { status: "in_progress" });
      deps.eventBus.emitTyped("project.planning_completed", {
        projectId,
        workstreamIds: createdWorkstreams.map((ws) => ws.id),
      });

      try {
        await deps.auditLogRepo.createAuditLog({
          projectId,
          entityType: "project",
          entityId: projectId,
          action: "completed",
          actorType: "agent",
          actorId: "architect",
          metadata: { phase: "planning", workstreamCount: createdWorkstreams.length },
        });
      } catch (err) {
        console.warn("[Planning] Failed to create audit log for planning completion:", err);
      }

      return {
        projectId,
        workstreamCount: createdWorkstreams.length,
        filesCreated: relativeFiles.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Planning] Project ${projectId} failed:`, errorMessage);

      try {
        await deps.projectRepo.updateProject(projectId, { status: "failed" });
        deps.eventBus.emitTyped("project.failed", { projectId, error: errorMessage });
      } catch (updateErr) {
        console.error("[Planning] Failed to update project status:", updateErr);
      }

      throw error;
    }
  };
}
