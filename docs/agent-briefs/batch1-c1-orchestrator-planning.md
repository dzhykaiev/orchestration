# Batch 1 Brief — C1 Orchestrator Planning

## Mission

Normalize planning module boundaries and side-effect isolation in orchestrator.

## Ownership

You may edit only:
- `apps/orchestrator/src/application/planning/**`
- `apps/orchestrator/src/infrastructure/planning/**`
- `apps/orchestrator/src/workers/planning.ts`
- planning-focused tests (`apps/orchestrator/src/workers/planning.test.ts` and nearest planning tests)

Do not edit API routes or shared contracts in this task.

## Inputs

Read first:
- `docs/plans/batch-1-execution-2026-04-01.md`
- `docs/contracts/events.md`
- `docs/contracts/queues.md`
- `docs/architecture/dependency-rules.md`

## Required Outcomes

1. Planning use-cases depend only on ports/dependencies, not concrete infra internals.
2. Event emission in planning flow matches shared event names/payload shape.
3. Implementation queue enqueue from planning is consistent and test-covered.

## Risks to Avoid

- Silent behavior changes in project/workstream status transitions.
- Drift between emitted events and `packages/shared` event contract.
- Coupling planning use-case to runtime wiring.

## Validation

1. Typecheck orchestrator workspace.
2. Run planning worker tests.
3. Assert planning emits expected lifecycle events and enqueues implement jobs.

## Definition of Done

- Planning module follows ports-and-adapters boundary.
- Event/queue calls are contract-consistent and tested.
- No forbidden imports per dependency rules.
