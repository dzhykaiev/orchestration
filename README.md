# Orchestration

AI-driven software development orchestration platform. Provide a high-level software goal, and the system breaks it into workstreams, dispatches them to specialized AI agents, and tracks progress to completion.

## How It Works

1. **Create a company** — Define company name, strategic goal, and bootstrap operator agent
2. **Start ticket-first operations** — The system creates an initial operating ticket automatically
3. **Hire and delegate via tickets** — Agents are hired from ticket context and receive delegated tickets
4. **Run 24/7 execution** — Autonomous runner picks ready tickets, kicks off execution projects, and applies retry/backoff
5. **Track everything in logs** — Ticket timelines capture user, agent, and system communication

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Web UI      │────▶│  API Server  │────▶│  Orchestrator    │
│  (Next.js)   │◀────│  (Fastify)   │◀────│  (BullMQ Workers)│
└─────────────┘     └──────┬──────┘     └────────┬─────────┘
                           │                      │
                    ┌──────┴──────┐        ┌──────┴──────┐
                    │  PostgreSQL  │        │  Redis       │
                    │  (data)      │        │  (queues)    │
                    └─────────────┘        └─────────────┘
```

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Language | TypeScript | Single language, type safety across all boundaries |
| API | Fastify | Fast, schema validation, TypeScript-first |
| Frontend | Next.js 15 | Rapid dashboard development, React ecosystem |
| Database | PostgreSQL | Structured data, JSONB for flexible output |
| Queue | BullMQ + Redis | Job orchestration with priorities and retries |
| AI | Anthropic Claude API | Best reasoning for architecture and code generation |
| Monorepo | pnpm workspaces | Fast, strict dependency management |
| Testing | Vitest | Fast, TypeScript-native |
| Linting | Biome | Fast single-tool formatting and linting |

## Project Structure

<!-- PROJECT_STRUCTURE_START -->
```
.agents/
  skills/
    adr-writer/
    execution-plan/
    frontend-design/
    frontend-ux-review/
    jira-task-captain/
    product-design-review/
    product-designer-jira/
    product-flow-redesign/
    project-architect-review/
    ux-improvement-plan/
.opencode/
  plans/
.pnpm-store/
  v3/
apps/
  api/
    src/
  orchestrator/
    projects/
    src/
  web/
    src/
contracts/
  api/
  events/
docs/
  .vitepress/
    cache/
  agent-briefs/
  agents/
  api/
  architecture/
  contracts/
  decisions/
  design/
  guide/
  improvements/
  ownership/
  parallel-execution/
    agent-playbooks/
  plans/
  runbooks/
jira/
  _meta/
  blocked/
  done/
  inprogress/
  todo/
logs/
packages/
  db/
    drizzle/
    src/
  shared/
    src/
scripts/
```

<!-- PROJECT_STRUCTURE_END -->

## Quick Start

```bash
# Prerequisites: Node 20+, pnpm 9+, Docker

# Install dependencies
pnpm install

# Start infrastructure
docker compose up -d

# Copy environment config
cp .env.example .env

# Start all dev servers
pnpm dev
```

See [docs/runbooks/local-development.md](docs/runbooks/local-development.md) for detailed setup.

## Documentation

| Document | Description |
|----------|-------------|
| [Product Overview](docs/product-overview.md) | What this system does and MVP scope |
| [Zero-Human Company Flow](docs/product-flow-zero-human-company.md) | Jira-like autonomous company flow, entities, and operating model |
| [Architecture](docs/architecture.md) | System design, data flow, database schema |
| [Stack Decisions](docs/stack-decisions.md) | Why each technology was chosen |
| [Agent Company Runbook](docs/runbooks/agent-company-operations.md) | Practical operating guide for autonomous ticket execution |
| [Implementation Plan](docs/plans/implementation-plan.md) | Phased build plan |
| [Workstreams](docs/plans/workstreams.md) | Parallel work definitions |
| [Assumptions](docs/assumptions.md) | Assumptions made for MVP |
| [Contracts](docs/contracts/README.md) | Contract-first development approach |
| [ADR-001](docs/decisions/ADR-001-initial-architecture.md) | Initial architecture decision |

## Agent Briefs

Each agent has an execution brief defining its mission, boundaries, owned files, and done criteria:

- [Architect](docs/agent-briefs/architect.md) — Designs system, defines contracts
- [Backend](docs/agent-briefs/backend.md) — Implements Fastify API
- [Frontend](docs/agent-briefs/frontend.md) — Builds Next.js dashboard
- [Data](docs/agent-briefs/data.md) — Database schema, migrations, repositories
- [DevOps](docs/agent-briefs/devops.md) — Infrastructure, CI, tooling
- [QA](docs/agent-briefs/qa.md) — Tests and contract validation

## Development

```bash
pnpm dev          # Start all services in dev mode
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm typecheck    # Type-check all packages
pnpm lint         # Lint all files
pnpm format       # Format all files
```
