# Orchestration

AI-driven software development orchestration platform. Provide a high-level software goal, and the system breaks it into workstreams, dispatches them to specialized AI agents, and tracks progress to completion.

## How It Works

1. **Submit a goal** — Describe what you want built in plain language
2. **Architect agent plans** — Breaks the goal into architecture, contracts, and parallel workstreams
3. **Implementation agents execute** — Backend, frontend, data, and DevOps agents work in parallel
4. **Progress tracked** — Dashboard shows real-time status of all workstreams and tasks

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
    frontend-design/
agents/
apps/
  api/
    src/
  orchestrator/
    src/
  web/
    src/
docs/
  contracts/
  decisions/
  runbooks/
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
| [Architecture](docs/architecture.md) | System design, data flow, database schema |
| [Stack Decisions](docs/stack-decisions.md) | Why each technology was chosen |
| [Implementation Plan](docs/implementation-plan.md) | Phased build plan |
| [Workstreams](docs/workstreams.md) | Parallel work definitions |
| [Assumptions](docs/assumptions.md) | Assumptions made for MVP |
| [Contracts](docs/contracts/README.md) | Contract-first development approach |
| [ADR-001](docs/decisions/ADR-001-initial-architecture.md) | Initial architecture decision |

## Agent Briefs

Each agent has an execution brief defining its mission, boundaries, owned files, and done criteria:

- [Architect](agents/architect-brief.md) — Designs system, defines contracts
- [Backend](agents/backend-agent.md) — Implements Fastify API
- [Frontend](agents/frontend-agent.md) — Builds Next.js dashboard
- [Data](agents/data-agent.md) — Database schema, migrations, repositories
- [DevOps](agents/devops-agent.md) — Infrastructure, CI, tooling
- [QA](agents/qa-agent.md) — Tests and contract validation

## Development

```bash
pnpm dev          # Start all services in dev mode
pnpm build        # Build all packages
pnpm test         # Run all tests
pnpm typecheck    # Type-check all packages
pnpm lint         # Lint all files
pnpm format       # Format all files
```
