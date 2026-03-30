import type { Job } from "bullmq";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { runClaude, listFilesRecursive } from "../llm/claude.js";
import {
  ARCHITECT_SYSTEM_PROMPT,
  parseArchitecture,
  parseWorkstreams,
} from "../prompts/architect.js";
import { buildUserMessage } from "../prompts/implementation.js";
import * as repo from "../db/repositories.js";
import type { AgentRole } from "@orchestration/shared";

const connection = new IORedis.default(process.env.REDIS_URL || "redis://localhost:6379");
const implementationQueue = new Queue("implementation", { connection });

const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

interface PlanningJobData {
  projectId: string;
  goal: string;
}

export async function handlePlanningJob(job: Job<PlanningJobData>) {
  const { projectId, goal } = job.data;
  console.log(`Planning project ${projectId}: ${goal}`);

  // 1. Create isolated project directory
  const projectDir = resolve(PROJECTS_DIR, projectId);
  await mkdir(projectDir, { recursive: true });

  // 2. Update project status
  await repo.updateProject(projectId, { status: "planning" });

  // 3. Run Claude architect in the project directory
  const { result } = await runClaude({
    prompt: `Project goal: ${goal}\n\nScaffold the project and create the initial architecture. Then output the workstream plan.`,
    systemPrompt: ARCHITECT_SYSTEM_PROMPT,
    cwd: projectDir,
  });

  console.log(`Architect finished for ${projectId}`);

  // 4. Parse architecture and workstreams from Claude's text output
  const architecture = parseArchitecture(result);

  let workstreamDefs: ReturnType<typeof parseWorkstreams>;
  try {
    workstreamDefs = parseWorkstreams(result);
  } catch {
    // Claude completed the whole project without needing workstreams
    // (simple projects). Mark as completed directly.
    console.log(`No workstreams block — architect completed the project directly`);
    const createdFiles = await listFilesRecursive(projectDir);
    const relativeFiles = createdFiles.map((f) => f.replace(projectDir + "/", ""));
    console.log(`Architect created ${relativeFiles.length} files:`, relativeFiles);
    await repo.updateProject(projectId, { architecture: architecture || result, status: "completed" });
    return { projectId, workstreamCount: 0, filesCreated: relativeFiles.length };
  }

  // 5. Track files created by architect
  const createdFiles = await listFilesRecursive(projectDir);
  const relativeFiles = createdFiles.map((f) => f.replace(projectDir + "/", ""));
  console.log(`Architect created ${relativeFiles.length} files:`, relativeFiles);

  // 6. Store architecture on project
  await repo.updateProject(projectId, { architecture });

  // 7. Create workstreams in DB
  const createdWorkstreams = [];
  for (const wsDef of workstreamDefs) {
    const ws = await repo.createWorkstream({
      projectId,
      name: wsDef.name,
      objective: wsDef.objective,
      dependencies: wsDef.dependencies,
      deliverables: wsDef.deliverables,
      ownedPaths: wsDef.ownedPaths,
      assignedAgent: wsDef.assignedAgent,
      order: wsDef.order,
    });
    createdWorkstreams.push(ws);
  }

  // 8. Build name-to-id map
  const nameToId = new Map(createdWorkstreams.map((ws) => [ws.name, ws.id]));

  // 9. Dispatch tasks for workstreams with no dependencies
  for (const ws of createdWorkstreams) {
    const deps = ws.dependencies as string[];
    const hasDeps = deps.length > 0;

    if (!hasDeps) {
      await repo.updateWorkstream(ws.id, { status: "in_progress" });

      const role = (ws.assignedAgent as AgentRole) || "backend";
      const task = await repo.createTask({
        workstreamId: ws.id,
        projectId,
        role,
        prompt: buildUserMessage(
          `Implement the ${ws.name} workstream: ${ws.objective}`,
          ws,
        ),
      });

      await implementationQueue.add("implement", {
        taskId: task.id,
        workstreamId: ws.id,
        projectId,
        role: task.role,
        prompt: task.prompt,
      });
    }
  }

  // 10. Update project status
  await repo.updateProject(projectId, { status: "in_progress" });

  return { projectId, workstreamCount: createdWorkstreams.length, filesCreated: relativeFiles.length };
}
