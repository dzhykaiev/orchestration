import type { LLMProvider, RunOptions, RunResult } from "@orchestration/shared";
import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { listFilesRecursive } from "./file-utils.js";

/**
 * Claude CLI provider implementation.
 * Uses the Claude desktop CLI with full tool access.
 */
export class ClaudeProvider implements LLMProvider {
  async run(options: RunOptions): Promise<RunResult> {
    const { prompt, systemPrompt, cwd, model, sessionId } = options;

    // Write system prompt and prompt to temp files
    const tmpDir = await mkdtemp(join(tmpdir(), "orchestration-"));

    try {
      const args = [
        "--print",
        "--output-format",
        "json",
        "--verbose",
        "--dangerously-skip-permissions",
      ];

      // Resume existing session
      if (sessionId) {
        args.push("--resume", sessionId);
      }

      if (model) {
        args.push("--model", model);
      }

      // When resuming a session, skip system prompt (session already has context)
      if (systemPrompt && !sessionId) {
        const systemPromptFile = join(tmpDir, "system-prompt.md");
        await writeFile(systemPromptFile, systemPrompt, "utf-8");
        args.push("--system-prompt-file", systemPromptFile);
      }

      // Pass prompt as positional argument via a temp file piped to stdin
      // to avoid shell argument length limits
      const promptFile = join(tmpDir, "prompt.txt");
      await writeFile(promptFile, prompt, "utf-8");

      return await new Promise<RunResult>((resolvePromise, reject) => {
        const child = spawn("sh", ["-c", `cat "${promptFile}" | claude ${args.map((a) => `'${a}'`).join(" ")}`], {
          stdio: ["pipe", "pipe", "pipe"],
          cwd,
          env: { ...process.env },
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on("data", (data: Buffer) => {
          stderr += data.toString();
        });

        child.on("error", (err) => {
          reject(new Error(`Failed to spawn claude CLI: ${err.message}`));
        });

        child.on("close", (code) => {
          if (code !== 0 && code !== null) {
            reject(
              new Error(`claude CLI exited with code ${code}: ${stderr || stdout}`),
            );
            return;
          }

          try {
            const parsed = JSON.parse(stdout);
            resolvePromise({
              result: parsed.result ?? "",
              sessionId: parsed.session_id ?? undefined,
              exitCode: code ?? undefined,
              costUsd: parsed.total_cost_usd ?? 0,
            });
          } catch {
            resolvePromise({
              result: stdout.trim(),
              exitCode: code ?? undefined,
            });
          }
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
