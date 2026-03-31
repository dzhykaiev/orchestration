import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LLMProvider, RunOptions, RunResult } from "@orchestration/shared";
import { listFilesRecursive } from "./file-utils.js";

/** Configurable timeout for LLM execution (default: 10 minutes) */
const LLM_TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS) || 600_000;

/**
 * OpenCode provider implementation.
 * Uses the OpenCode CLI with full tool access.
 * Requires: opencode CLI installed and authenticated.
 *
 * OpenCode outputs NDJSON (one JSON per line) with event types:
 * - step_start, step_finish, text, tool_use, error, etc.
 */
export class OpenCodeProvider implements LLMProvider {
  async run(options: RunOptions): Promise<RunResult> {
    const { prompt, systemPrompt, cwd, model, sessionId } = options;

    // When resuming a session, skip system prompt (session already has context)
    const combinedPrompt = sessionId
      ? prompt
      : systemPrompt
        ? `${systemPrompt}\n\n---\n\nUser request:\n${prompt}`
        : prompt;

    const tmpDir = await mkdtemp(join(tmpdir(), "orchestration-"));

    try {
      // Write prompt to temp file
      const promptFile = join(tmpDir, "prompt.txt");
      await writeFile(promptFile, combinedPrompt, "utf-8");

      const args = ["run", "--format", "json", "--dir", cwd];

      // Resume existing session or create new one
      if (sessionId) {
        args.push("--session", sessionId);
      }

      // Add model flag if specified
      if (model || process.env.OPENCODE_MODEL) {
        const modelToUse = model ?? process.env.OPENCODE_MODEL ?? "default";
        args.push("--model", modelToUse);
      }

      return await new Promise<RunResult>((resolvePromise, reject) => {
        let settled = false;

        // Pass prompt via stdin instead of shell arg to avoid length limits
        const child = spawn("opencode", args, {
          stdio: ["pipe", "pipe", "pipe"],
          cwd,
          env: { ...process.env },
        });

        // Set up timeout to kill the process if it exceeds LLM_TIMEOUT_MS
        const timeoutTimer = setTimeout(() => {
          if (!settled) {
            settled = true;
            child.kill("SIGKILL");
            reject(new Error(`LLM execution timed out after ${LLM_TIMEOUT_MS}ms`));
          }
        }, LLM_TIMEOUT_MS);

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        child.on("error", (err) => {
          if (!settled) {
            settled = true;
            clearTimeout(timeoutTimer);
            reject(new Error(`Failed to spawn opencode CLI: ${err.message}`));
          }
        });

        // Write prompt to stdin and close
        child.stdin.write(combinedPrompt);
        child.stdin.end();

        child.on("close", (code) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeoutTimer);

          if (code !== 0 && code !== null) {
            reject(new Error(`opencode CLI exited with code ${code}: ${stderr || stdout}`));
            return;
          }

          // Parse NDJSON output (one JSON object per line)
          const textParts: string[] = [];
          let sessionId: string | undefined;
          let costUsd = 0;
          const metadata: Record<string, unknown> = {};

          for (const line of stdout.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            try {
              const event = JSON.parse(trimmed);

              // Track session ID from any event
              if (event.sessionID && !sessionId) {
                sessionId = event.sessionID;
              }

              // Collect text from "text" events
              if (event.type === "text" && event.part?.text) {
                textParts.push(event.part.text);
              }

              // Extract cost from "step_finish" events
              if (event.type === "step_finish" && event.part?.cost != null) {
                costUsd = event.part.cost;
              }

              // Capture error events
              if (event.type === "error") {
                metadata.error = event.part?.error ?? event.part?.message;
              }
            } catch {
              // skip non-JSON lines
            }
          }

          const result = textParts.join("") || stdout.trim();

          resolvePromise({
            result,
            sessionId,
            exitCode: code ?? undefined,
            costUsd,
            metadata,
          });
        });
      });
    } finally {
      rm(tmpDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  async listFiles(dir: string): Promise<string[]> {
    return listFilesRecursive(dir);
  }
}
