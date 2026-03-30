import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { projectRepo, taskRepo, workstreamRepo } from "@orchestration/db";
import type { ValidationStatus } from "@orchestration/shared";
import type { Job } from "bullmq";
import { eventBus } from "../events/index.js";
import { createLLMProvider } from "../llm/index.js";
import { AGENT_BRIEFS } from "../prompts/briefs.js";

const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

interface ValidationJobData {
  workstreamId: string;
  projectId: string;
}

function buildValidationPrompt(
  workstream: { name: string; objective: string; deliverables: string[] },
  modifiedFiles: string[],
): string {
  return `## Workstream: ${workstream.name}

**Objective:** ${workstream.objective}

**Deliverables:**
${workstream.deliverables.map((d) => `- ${d}`).join("\n")}

**Files modified by implementation agents:**
${modifiedFiles.length > 0 ? modifiedFiles.map((f) => `- ${f}`).join("\n") : "No files recorded."}

## Task

Validate the implementation of this workstream:

1. Check that all deliverables listed above are implemented
2. Verify the code compiles or builds successfully (run build/lint commands if available)
3. Run basic tests if test infrastructure exists
4. Check for obvious issues (missing imports, syntax errors, incomplete implementations)

Provide a clear PASS/FAIL verdict at the end of your response on a line starting with "VERDICT: PASS" or "VERDICT: FAIL".
List any issues found.`;
}

export async function handleValidationJob(job: Job<ValidationJobData>) {
  const { workstreamId, projectId } = job.data;
  console.log(`[Validation] Starting for workstream ${workstreamId} | project ${projectId}`);

  try {
    const project = await projectRepo.getProjectById(projectId);
    const workstream = await workstreamRepo.getWorkstreamById(workstreamId);

    if (!project || !workstream) {
      throw new Error(`Project ${projectId} or workstream ${workstreamId} not found`);
    }

    // Resolve project directory, handling existing-mode repos
    const projectDir = project.repoPath
      ? resolve(project.repoPath)
      : resolve(PROJECTS_DIR, projectId);

    // Verify project directory exists before running QA agent
    try {
      await access(projectDir);
    } catch {
      throw new Error(`Project directory does not exist: ${projectDir}`);
    }

    // Collect all modified files from workstream tasks
    const tasks = await taskRepo.listTasksByWorkstream(workstreamId);
    const allModifiedFiles = [...new Set(tasks.flatMap((t) => t.filesModified ?? []))];

    if (allModifiedFiles.length === 0) {
      console.warn(
        `[Validation] No files modified for workstream ${workstreamId}, skipping QA agent`,
      );
      await workstreamRepo.updateWorkstream(workstreamId, {
        validationStatus: "pass" as ValidationStatus,
        validationOutput: "No files modified — nothing to validate.",
      });
      return;
    }

    // Create QA LLM provider (use project-level provider if available)
    const providerName =
      ((project as Record<string, unknown>)?.provider as string) ||
      process.env.LLM_PROVIDER ||
      undefined;
    const llmProvider = createLLMProvider("qa", providerName);

    const systemPrompt = `${AGENT_BRIEFS.qa}

## Project Architecture

${project.architecture || "No architecture document available."}

## Important
- Review the implementation thoroughly
- Check existing files to verify deliverables are complete
- Run build/test commands to verify correctness
- Be specific about any issues found`;

    const prompt = buildValidationPrompt(workstream, allModifiedFiles);

    const { result } = await llmProvider.run({
      prompt,
      systemPrompt,
      cwd: projectDir,
    });

    console.log(`[Validation] QA agent finished for workstream ${workstreamId}`);

    // Parse verdict — default to "fail" if no clear verdict found
    const verdictMatch = result.match(/VERDICT:\s*(PASS|FAIL)/i);
    const validationStatus: ValidationStatus =
      verdictMatch?.[1]?.toLowerCase() === "pass" ? "pass" : "fail";

    if (!verdictMatch) {
      console.warn(
        `[Validation] No VERDICT found in QA response for workstream ${workstreamId}, defaulting to fail`,
      );
    }

    // Store validation result on workstream
    await workstreamRepo.updateWorkstream(workstreamId, {
      validationStatus,
      validationOutput: result,
    });

    eventBus.emitTyped("workstream.completed", {
      workstreamId,
      projectId,
      validationResult: { status: validationStatus, output: result },
    });

    console.log(`[Validation] Workstream ${workstreamId} verdict: ${validationStatus}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Validation] Failed for workstream ${workstreamId}:`, errorMessage);

    // Store the error as validation output — wrap in try/catch to not mask the original error
    try {
      await workstreamRepo.updateWorkstream(workstreamId, {
        validationStatus: "error" as ValidationStatus,
        validationOutput: `Validation error: ${errorMessage}`,
      });
    } catch (updateErr) {
      console.error("[Validation] Failed to update workstream status:", updateErr);
    }

    eventBus.emitTyped("workstream.failed", {
      workstreamId,
      projectId,
      error: `Validation error: ${errorMessage}`,
    });
  }
}
