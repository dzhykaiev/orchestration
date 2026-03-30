/**
 * Abstract interface for LLM providers (Claude, OpenCode, etc.)
 */
export interface LLMProvider {
  /**
   * Run the LLM with given prompt and system prompt in a working directory.
   * @returns The result output and optional metadata (cost, sessionId, etc.)
   */
  run(options: RunOptions): Promise<RunResult>;

  /**
   * List all files in a directory recursively.
   */
  listFiles(dir: string): Promise<string[]>;
}

export interface RunOptions {
  /** User prompt / task description */
  prompt: string;
  /** System prompt / instructions */
  systemPrompt?: string;
  /** Working directory where the LLM can read/write files */
  cwd: string;
  /** Optional model override */
  model?: string;
  /** Resume an existing session by ID */
  sessionId?: string;
}

export interface RunResult {
  /** The text output from the LLM */
  result: string;
  /** Session ID if available */
  sessionId?: string;
  /** Exit code if applicable */
  exitCode?: number;
  /** Estimated cost in USD if available */
  costUsd?: number;
  /** Raw provider-specific data */
  metadata?: Record<string, unknown>;
}
