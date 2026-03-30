import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

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

export async function callClaude(opts: ClaudeCallOptions): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: opts.maxTokens ?? 8192,
    temperature: opts.temperature ?? 0,
    system: opts.system,
    messages: opts.messages,
  });

  const textBlocks = response.content.filter(
    (block): block is Anthropic.TextBlock => block.type === "text",
  );
  return textBlocks.map((block) => block.text).join("\n");
}
