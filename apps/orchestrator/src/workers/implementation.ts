import type { Job } from "bullmq";
import { Queue } from "bullmq";
import IORedis from "ioredis";
import { callClaude } from "../llm/claude.js";
import { buildSystemPrompt } from "../prompts/implementation.js";
import { parseFileChanges } from "../output/response-parser.js";
import { writeFiles } from "../output/file-writer.js";
import { checkWorkstreamCompletion } from "../tracking/progress.js";
import * as repo from "../db/repositories.js";
import type { AgentRole } from "../../../../contracts/types/agent-task.js";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
const implementationQueue = new Queue("implementation", { connection });

interface ImplementationJobData {
  taskId: string;
  workstreamId: string;
  projectId: string;
  role: string;
  prompt: string;
}

export async function handleImplementationJob(job: Job<ImplementationJobData>) {
  const { taskId, workstreamId, projectId, role, prompt } = job.data;
  console.log(`Running ${role} agent for task ${taskId}`);

  // 1. Mark task as started
  await repo.markTaskStarted(taskId);

  try {
    // 2. Load project for architecture context
    const project = await repo.getProjectById(projectId);
    const workstream = await repo.getWorkstreamById(workstreamId);

    if (!project || !workstream) {
      throw new Error(`Project ${projectId} or workstream ${workstreamId} not found`);
    }

    // 3. Build prompts
    const systemPrompt = buildSystemPrompt(
      role as AgentRole,
      project.architecture || "",
    );

    // 4. Call Claude
    const response = await callClaude({
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
      maxTokens: 16384,
      temperature: 0,
    });

    // 5. Parse file changes
    const files = parseFileChanges(response);

    if (files.length === 0) {
      // No files extracted — store output as-is (could be docs/planning)
      await repo.markTaskCompleted(taskId, response, []);
    } else {
      // 6. Write files to disk
      const writtenPaths = await writeFiles(projectId, files);

      // 7. Mark task completed
      await repo.markTaskCompleted(taskId, response, writtenPaths);
    }

    // 8. Check workstream completion and unblock dependents
    await checkWorkstreamCompletion(workstreamId, projectId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Task ${taskId} failed:`, errorMessage);
    await repo.markTaskFailed(taskId, errorMessage);

    // Check if we should retry
    const task = await repo.getTaskById(taskId);
    if (task && task.attempts < task.maxAttempts) {
      // Re-enqueue with error context
      const retryPrompt = `${prompt}\n\n---\nPrevious attempt failed with error: ${errorMessage}\nPlease fix the issue and try again.`;

      await implementationQueue.add(
        "implement",
        {
          taskId,
          workstreamId,
          projectId,
          role,
          prompt: retryPrompt,
        },
        { delay: 5000 * task.attempts },
      );
    } else {
      // Max attempts reached
      await checkWorkstreamCompletion(workstreamId, projectId);
    }
  }
}
