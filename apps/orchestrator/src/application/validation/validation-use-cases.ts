import { access } from "node:fs/promises";
import { resolve } from "node:path";
import type { ValidationStatus } from "@orchestration/shared";
import type {
  ValidationDependencies,
  ValidationJobData,
  ValidationJobHandler,
  ValidationPromptWorkstream,
} from "./ports.js";

const PROJECTS_DIR = resolve(process.env.PROJECTS_DIR || "./projects");

function buildValidationPrompt(
  workstream: ValidationPromptWorkstream,
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

function parseValidationStatus(result: string): ValidationStatus {
  const verdictMatch = result.match(/VERDICT:\s*(PASS|FAIL)/i);
  return verdictMatch?.[1]?.toLowerCase() === "pass" ? "pass" : "fail";
}

export function createValidationJobHandler(deps: ValidationDependencies): ValidationJobHandler {
  return async (job: { data: ValidationJobData }) => {
    const { workstreamId, projectId } = job.data;
    console.log(`[Validation] Starting for workstream ${workstreamId} | project ${projectId}`);

    try {
      const project = await deps.projectRepo.getProjectById(projectId);
      const workstream = await deps.workstreamRepo.getWorkstreamById(workstreamId);

      if (!project || !workstream) {
        throw new Error(`Project ${projectId} or workstream ${workstreamId} not found`);
      }

      const projectDir = project.repoPath
        ? resolve(project.repoPath)
        : resolve(PROJECTS_DIR, projectId);

      try {
        await access(projectDir);
      } catch {
        throw new Error(`Project directory does not exist: ${projectDir}`);
      }

      const tasks = await deps.taskRepo.listTasksByWorkstream(workstreamId);
      const allModifiedFiles = [...new Set(tasks.flatMap((task) => task.filesModified ?? []))];

      if (allModifiedFiles.length === 0) {
        console.warn(
          `[Validation] No files modified for workstream ${workstreamId}, skipping QA agent`,
        );
        await deps.workstreamRepo.updateWorkstream(workstreamId, {
          validationStatus: "pass" as ValidationStatus,
          validationOutput: "No files modified — nothing to validate.",
        });

        await deps.unblockDependents(workstreamId, projectId);
        await deps.checkProjectCompletion(projectId);
        return;
      }

      const llmProvider = deps.createLLMProvider("qa", deps.resolveProvider(project.provider));

      const systemPrompt = `${deps.qaBrief}

## Project Architecture

${project.architecture || "No architecture document available."}

## Important
- Review the implementation thoroughly
- Check existing files to verify deliverables are complete
- Run build/test commands to verify correctness
- Be specific about any issues found`;

      const prompt = buildValidationPrompt(
        {
          name: workstream.name,
          objective: workstream.objective,
          deliverables: workstream.deliverables,
        },
        allModifiedFiles,
      );

      const { result } = await llmProvider.run({
        prompt,
        systemPrompt,
        cwd: projectDir,
      });

      console.log(`[Validation] QA agent finished for workstream ${workstreamId}`);

      const validationStatus = parseValidationStatus(result);

      if (!result.match(/VERDICT:\s*(PASS|FAIL)/i)) {
        console.warn(
          `[Validation] No VERDICT found in QA response for workstream ${workstreamId}, defaulting to fail`,
        );
      }

      await deps.workstreamRepo.updateWorkstream(workstreamId, {
        validationStatus,
        validationOutput: result,
      });

      try {
        await deps.auditLogRepo.createAuditLog({
          projectId,
          entityType: "workstream",
          entityId: workstreamId,
          action: "reviewed",
          actorType: "agent",
          actorId: "qa",
          metadata: { validationStatus },
        });
      } catch (err) {
        console.warn("[Validation] Failed to create audit log for validation:", err);
      }

      try {
        await deps.artifactRepo.createArtifact({
          projectId,
          workstreamId,
          type: "review_report",
          name: `QA Validation - ${workstream.name}`,
          content: result,
          metadata: { validationStatus },
        });
      } catch (err) {
        console.warn("[Validation] Failed to create review_report artifact:", err);
      }

      if (validationStatus === "fail") {
        const ws = await deps.workstreamRepo.getWorkstreamById(workstreamId);
        if (ws && deps.canWorkstreamTransition(ws.status, "failed")) {
          await deps.workstreamRepo.updateWorkstream(workstreamId, { status: "failed" });
          deps.eventBus.emitTyped("workstream.failed", {
            workstreamId,
            projectId,
            error: `Validation failed: ${result.slice(0, 500)}`,
          });
        } else {
          console.warn(
            `[Validation] Cannot transition workstream ${workstreamId} (status: ${ws?.status}) to failed`,
          );
        }

        await deps.checkProjectCompletion(projectId);
      } else {
        deps.eventBus.emitTyped("workstream.completed", {
          workstreamId,
          projectId,
          validationResult: { status: validationStatus, output: result },
        });

        await deps.unblockDependents(workstreamId, projectId);
        await deps.checkProjectCompletion(projectId);
      }

      console.log(`[Validation] Workstream ${workstreamId} verdict: ${validationStatus}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[Validation] Failed for workstream ${workstreamId}:`, errorMessage);

      try {
        await deps.workstreamRepo.updateWorkstream(workstreamId, {
          validationStatus: "error" as ValidationStatus,
          validationOutput: `Validation error: ${errorMessage}`,
        });
      } catch (updateErr) {
        console.error("[Validation] Failed to update workstream status:", updateErr);
      }

      deps.eventBus.emitTyped("workstream.failed", {
        workstreamId,
        projectId,
        error: `Validation error: ${errorMessage}`,
      });
    }
  };
}
