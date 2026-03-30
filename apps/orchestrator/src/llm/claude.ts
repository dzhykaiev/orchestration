import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm, readdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";

export interface ClaudeRunOptions {
  prompt: string;
  systemPrompt?: string;
  cwd: string;
}

export interface ClaudeRunResult {
  result: string;
  sessionId: string | null;
  exitCode: number | null;
  costUsd: number;
}

/**
 * Run Claude CLI with full tool access in a given working directory.
 * Claude will use its tools (Read, Write, Edit, Bash, etc.) to actually
 * create and modify files — like a real developer.
 */
export async function runClaude(opts: ClaudeRunOptions): Promise<ClaudeRunResult> {
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

    if (opts.systemPrompt) {
      const systemPromptFile = join(tmpDir, "system-prompt.md");
      await writeFile(systemPromptFile, opts.systemPrompt, "utf-8");
      args.push("--system-prompt-file", systemPromptFile);
    }

    // Pass prompt as positional argument via a temp file piped to stdin
    // to avoid shell argument length limits
    const promptFile = join(tmpDir, "prompt.txt");
    await writeFile(promptFile, opts.prompt, "utf-8");

    return await new Promise<ClaudeRunResult>((resolvePromise, reject) => {
      const child = spawn("sh", ["-c", `cat "${promptFile}" | claude ${args.map((a) => `'${a}'`).join(" ")}`], {
        stdio: ["pipe", "pipe", "pipe"],
        cwd: opts.cwd,
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
            sessionId: parsed.session_id ?? null,
            exitCode: code,
            costUsd: parsed.total_cost_usd ?? 0,
          });
        } catch {
          resolvePromise({
            result: stdout.trim(),
            sessionId: null,
            exitCode: code,
            costUsd: 0,
          });
        }
      });
    });
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * List all files in a directory recursively (for tracking what Claude created).
 */
export async function listFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      if (entry.isDirectory()) {
        const sub = await listFilesRecursive(fullPath);
        results.push(...sub);
      } else {
        results.push(fullPath);
      }
    }
  } catch {
    // directory doesn't exist yet
  }
  return results;
}
