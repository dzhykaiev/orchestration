import type { Job } from "bullmq";
import { resolve } from "node:path";
import { createLLMProvider } from "../llm/index.js";
import { AGENT_BRIEFS } from "../prompts/briefs.js";
import { projectRepo, workstreamRepo, taskRepo } from "@orchestration/db";
import type { ValidationStatus } from "@orchestration/shared";
import { eventBus } from "../events/index.js";

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
  console.log(`[Validation] Starting validation for workstream ${workstreamId}`);

  const projectDir = resolve(PROJECTS_DIR, projectId);

  try {
    const project = await projectRepo.getProjectById(projectId);
    const workstream = await workstreamRepo.getWorkstreamById(workstreamId);

    if (!project || !workstream) {
      throw new Error(`Project ${projectId} or workstream ${workstreamId} not found`);
    }

    // Collect all modified files from workstream tasks
    const tasks = await taskRepo.listTasksByWorkstream(workstreamId);
    const allModifiedFiles = [...new Set(tasks.flatMap((t) => t.filesModified ?? []))];

    // Create QA LLM provider
    const llmProvider = createLLMProvider("qa");

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

    // Parse verdict
    const verdictMatch = result.match(/VERDICT:\s*(PASS|FAIL)/i);
    const validationStatus: ValidationStatus = verdictMatch?.[1]?.toLowerCase() === "pass" ? "pass" : "fail";

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

    console.log(
      `[Validation] Workstream ${workstreamId} validation ${validationStatus}`,
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(
      `[Validation] Validation failed for workstream ${workstreamId}:`,
      errorMessage,
    );

    // Store the error as validation output
    await workstreamRepo.updateWorkstream(workstreamId, {
      validationStatus: "error" as ValidationStatus,
      validationOutput: `Validation error: ${errorMessage}`,
    });

    eventBus.emitTyped("workstream.failed", {
      workstreamId,
      projectId,
      error: `Validation error: ${errorMessage}`,
    });
  }
}
