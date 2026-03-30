import { spawn } from "node:child_process";

export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeCallOptions {
  system: string;
  messages: ClaudeMessage[];
  maxTokens?: number;
  temperature?: number;
}

interface ClaudeCliJsonResponse {
  result: string;
  session_id: string;
  [key: string]: unknown;
}

export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  // Build the user prompt from messages
  const userMessage = opts.messages
    .map((m) => (m.role === "user" ? m.content : `[assistant]: ${m.content}`))
    .join("\n\n");

  const args = [
    "-p",
    userMessage,
    "--bare",
    "--output-format",
    "json",
    "--system-prompt",
    opts.system,
  ];

  if (opts.maxTokens) {
    args.push("--max-tokens", String(opts.maxTokens));
  }

  return new Promise<string>((resolve, reject) => {
    const child = spawn("claude", args, {
      stdio: ["pipe", "pipe", "pipe"],
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
      if (code !== 0) {
        reject(
          new Error(
            `claude CLI exited with code ${code}: ${stderr || stdout}`,
          ),
        );
        return;
      }

      try {
        const parsed: ClaudeCliJsonResponse = JSON.parse(stdout);
        resolve(parsed.result);
      } catch {
        // If JSON parsing fails, return raw stdout (might be plain text)
        resolve(stdout.trim());
      }
    });
  });
}
