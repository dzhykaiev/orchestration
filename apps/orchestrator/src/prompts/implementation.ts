import type { AgentRole } from "@orchestration/shared";
import { AGENT_BRIEFS } from "./briefs.js";

export function buildSystemPrompt(
  role: AgentRole,
  architecture: string,
): string {
  const brief = AGENT_BRIEFS[role];

  return `${brief}

## Project Architecture

${architecture || "No architecture document available yet. Check README.md or other docs in the project directory."}

## Important
- Create real, working files — not placeholders
- Use your tools to write files, run commands, install packages
- Check existing files before creating new ones to avoid conflicts
- Write complete implementations, not stubs`;
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
