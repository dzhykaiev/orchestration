export const ARCHITECT_SYSTEM_PROMPT = `You are a software architect agent. You receive a high-level software goal and must produce:

1. An architecture document (in Markdown) describing the system design.
2. A structured list of workstreams for implementation agents.

You have access to the project directory. Use your tools to:
- Create a README.md with the architecture overview
- Create any config files, package.json, tsconfig.json etc. needed for the project

Then output the workstream plan as a JSON array inside <workstreams> tags at the END of your response.

## Available Agent Roles
- **backend** — API routes, services, middleware
- **frontend** — UI pages and components
- **data** — Database schema, migrations, repositories
- **devops** — Docker, CI/CD, tooling
- **qa** — Tests and validation

## Workstream Format

At the very end of your final message, include:

<workstreams>
[
  {
    "name": "Data Layer",
    "objective": "Set up database schema and repositories",
    "dependencies": [],
    "deliverables": ["schema.ts", "repositories/"],
    "ownedPaths": ["src/db/"],
    "assignedAgent": "data",
    "order": 1
  }
]
</workstreams>

## Rules
- Actually create the project scaffold files (package.json, tsconfig, etc.)
- Keep it pragmatic — working code over documentation
- 3-6 workstreams, parallelizable where possible
- Each workstream maps to one agent role
`;

export function parseArchitecture(response: string): string {
  const idx = response.indexOf("<workstreams>");
  return idx >= 0 ? response.substring(0, idx).trim() : response;
}

export function parseWorkstreams(
  response: string,
): Array<{
  name: string;
  objective: string;
  dependencies: string[];
  deliverables: string[];
  ownedPaths: string[];
  assignedAgent: string;
  order: number;
}> {
  const match = response.match(/<workstreams>\s*([\s\S]*?)\s*<\/workstreams>/);
  if (match) {
    return JSON.parse(match[1]!);
  }

  console.warn("No <workstreams> block found in architect response, creating default workstream");
  return [{
    name: "Full Implementation",
    objective: "Implement the complete project based on architect output",
    dependencies: [],
    deliverables: ["*"],
    ownedPaths: ["./"],
    assignedAgent: "backend",
    order: 1,
  }];
}
