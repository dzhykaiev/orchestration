import type { AgentRole } from "@orchestration/shared";
import { AGENT_BRIEFS } from "./briefs.js";

const SHARED_STANDARDS = `
## Output Format

- Produce real, working source files — never placeholders or stubs.
- Every file you write must be syntactically valid TypeScript/TSX/SQL/YAML (whatever the file extension implies).
- If a file already exists, read it before editing to avoid conflicts and duplicate definitions.

## File Creation Rules

- Use your Write tool to create new files, and your Edit tool to modify existing ones.
- Follow the directory structure described in your brief. Do not create files outside your owned paths.
- Each file should be self-contained and import its dependencies explicitly.
- Use \`@orchestration/*\` workspace aliases for cross-package imports (e.g., \`@orchestration/shared\`).

## Code Quality

- Write production-quality code: proper error handling, typed inputs/outputs, no \`any\` unless absolutely unavoidable.
- Follow the existing code style in the project. Check neighboring files for conventions (naming, formatting, import order).
- Include necessary \`import\` statements — do not assume types or functions are globally available.
- Use \`pnpm\` (not npm or yarn) for any dependency installation commands.

## Validation

- After writing code, mentally verify that TypeScript would accept it (correct types, no missing imports).
- For SQL migrations, ensure they are idempotent where possible (\`IF NOT EXISTS\`, \`ON CONFLICT\`, etc.).
- For configuration files, ensure they are valid (parseable YAML, JSON, etc.).`;

export function buildSystemPrompt(
  role: AgentRole,
  architecture: string,
): string {
  const brief = AGENT_BRIEFS[role];

  return `${brief}

## Project Architecture

${architecture || "No architecture document available yet. Check README.md or other docs in the project directory."}
${SHARED_STANDARDS}`;
}

export function buildUserMessage(
  prompt: string,
  workstream: { name: string; objective: string; deliverables: string[]; ownedPaths: string[] },
): string {
  return `## Workstream: ${workstream.name}

**Objective:** ${workstream.objective}

**Deliverables:** ${workstream.deliverables.join(", ")}

**Owned paths:** ${workstream.ownedPaths.join(", ")}

## Task

${prompt}

Implement all required files. Create them directly in the project directory using your tools.`;
}
