import type { AgentRole } from "@orchestration/shared";
import { AGENT_BRIEFS, OUTPUT_FORMAT_INSTRUCTION } from "./briefs.js";

export function buildSystemPrompt(
  role: AgentRole,
  architecture: string,
): string {
  const brief = AGENT_BRIEFS[role];

  return `${brief}

## Project Architecture

${architecture || "No architecture document available yet."}

${OUTPUT_FORMAT_INSTRUCTION}`;
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

Please implement all required files. Output each file using <file path="..."> tags.`;
}
