import type { Job } from "bullmq";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { callClaude } from "../llm/claude.js";
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

interface PlanningJobData {
  projectId: string;
  goal: string;
}

export async function handlePlanningJob(job: Job<PlanningJobData>) {
  const { projectId, goal } = job.data;
  console.log(`Planning project ${projectId}: ${goal}`);

  // 1. Update project status
  await repo.updateProject(projectId, { status: "planning" });

  // 2. Call Claude with architect prompt
  const response = await callClaude({
    system: ARCHITECT_SYSTEM_PROMPT,
    messages: [{ role: "user", content: `Project goal: ${goal}` }],
    maxTokens: 16384,
  });

  // 3. Parse architecture and workstreams
  const architecture = parseArchitecture(response);
  const workstreamDefs = parseWorkstreams(response);

  // 4. Store architecture on project
  await repo.updateProject(projectId, { architecture });

  // 5. Create workstreams in DB
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

  // 6. Build name-to-id map for dependency resolution
  const nameToId = new Map(createdWorkstreams.map((ws) => [ws.name, ws.id]));

  // 7. Resolve name-based dependencies to IDs and update workstreams
  for (const ws of createdWorkstreams) {
    const deps = ws.dependencies as string[];
    if (deps.length > 0) {
      const resolvedDeps = deps.map((dep) => nameToId.get(dep) ?? dep);
      // Update if any names were resolved to IDs
      if (resolvedDeps.some((d, i) => d !== deps[i])) {
        await repo.updateWorkstream(ws.id, {});
      }
    }
  }

  // 8. Dispatch tasks for workstreams with no dependencies
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

  // 9. Update project status
  await repo.updateProject(projectId, { status: "in_progress" });

  return { projectId, workstreamCount: createdWorkstreams.length };
}
