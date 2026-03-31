# Contracts

This repository uses **TypeScript-first contracts**.

## Source of Truth

Current authoritative contract locations are:

- `packages/shared/src/types/*` — domain and event types
- `packages/shared/src/schemas/*` — Zod request/response DTO contracts
- `packages/shared/src/state-machine.ts` — allowed lifecycle transitions
- `packages/db/src/schema.ts` — database schema contract
- `packages/db/drizzle/*` — migration history

`contracts/api` and `contracts/events` folders currently exist as placeholders and are not the active contract source.

Contract index and operational specs:
- `docs/contracts/contract-registry.md`
- `docs/contracts/events.md`
- `docs/contracts/queues.md`

## Practical Contract Boundaries

1. API boundary
- API routes in `apps/api/src/routes/*` parse/validate input via schemas re-exported from `@orchestration/shared`.
- Web client (`apps/web/src/lib/api.ts`) consumes these response DTOs.

2. Queue and orchestration boundary
- BullMQ job payload shapes are defined in orchestrator worker code and shared types.
- Event channel contract is `EVENTS_CHANNEL` + `OrchestratorEvent` from `packages/shared/src/types/events.ts`.

3. State transition boundary
- Transition legality is centralized in `packages/shared/src/state-machine.ts`.
- API and orchestrator both use these transition maps.

4. Data boundary
- DB tables/enums/indexes are defined in `packages/db/src/schema.ts`.
- Repositories in `packages/db/src/repositories/*` are the only data access interface used by apps.

## Change Rules

- Breaking type/schema changes must be done in `packages/shared` and/or `packages/db` first.
- Route and UI changes must consume shared contracts instead of introducing local duplicates.
- State transition changes must update `state-machine.ts` and related tests/docs together.

## Agent Guidance

When implementing or refactoring:

1. Read contracts from `packages/shared` and `packages/db` first.
2. Avoid introducing separate “shadow contracts” in app-local files.
3. If a new boundary appears, add the contract to shared package and document it here.
