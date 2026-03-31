# Implementation Plan

Six-phase build plan. Each phase has clear deliverables and builds on previous phases.

## Phase Overview

| Phase | Name | Status |
|-------|------|--------|
| 1 | Foundation | ✅ Completed |
| 2 | Orchestrator Core | ✅ Completed |
| 3 | Agent Runtime | ✅ Completed |
| 4 | Web Dashboard | ✅ Completed |
| 5 | Integration | 🔶 Mostly Complete |
| 6 | Polish | 🔶 Partially Complete |

## Phase 1: Foundation

Setup monorepo, infrastructure, shared types, and API scaffolding.

**Deliverables:**
- pnpm workspace configuration
- Docker Compose (PostgreSQL + Redis)
- TypeScript configuration with project references
- Biome linter/formatter
- Shared types package (`packages/shared`)
- Database schema and migrations (`packages/db`)
- Fastify API scaffolding (`apps/api`)
- Basic route structure

## Phase 2: Orchestrator Core

Build the planning pipeline and task dispatching system.

**Deliverables:**
- BullMQ queue setup (planning, implementation, validation)
- Planning worker — architect agent prompt and response parsing
- Task creation from architect plan
- Workstream dependency resolution
- Queue priority management
- Event emission on state changes

## Phase 3: Agent Runtime

Implement the agent execution engine — prompts, LLM calls, file writing.

**Deliverables:**
- LLM provider abstraction (Claude CLI, OpenCode)
- Prompt template system
- Implementation worker
- File snapshot and diff detection
- Validation worker (QA agent)
- Retry logic with error context
- Cost tracking per task

## Phase 4: Web Dashboard

Build the Next.js frontend for project management and progress tracking.

**Deliverables:**
- Project list page with search/filter
- Project detail page with workstream progress
- Task detail view with agent output
- Dependency graph visualization
- File tree browser
- SSE integration for real-time updates
- Feature board (Kanban)

## Phase 5: Integration

End-to-end flow testing and error handling.

**Deliverables:**
- Full orchestration flow: goal → planning → implementation → validation
- Status management across all entities
- Error propagation and recovery
- Workstream dependency unblocking
- Cost aggregation at project level

## Phase 6: Polish

Developer experience, documentation, and test coverage.

**Deliverables:**
- Development scripts (`pnpm dev`, `scripts/dev.sh`)
- Environment variable documentation
- API documentation
- Agent briefs
- Architecture documentation
- Test coverage on critical paths
- VitePress documentation site
