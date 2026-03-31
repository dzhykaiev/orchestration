# Batch 1 Execution Plan — 2026-04-01

## Execution Strategy

Run three parallel coding streams on top of Phase 0 guardrails:
- B1: API `projects` domain normalization
- C1: Orchestrator `planning` domain normalization
- D1: Shared state/transition hardening

Hard constraint: no cross-ownership edits without handoff.

## Workstreams

1. B1 — API Projects Domain
- Purpose: standardize use-case/dependency/route boundary in `projects` flow.
- Primary paths:
  - `apps/api/src/application/projects/**`
  - `apps/api/src/infrastructure/projects/**` (if introduced)
  - `apps/api/src/routes/projects.ts`

2. C1 — Orchestrator Planning Domain
- Purpose: isolate planning side effects behind explicit dependencies.
- Primary paths:
  - `apps/orchestrator/src/application/planning/**`
  - `apps/orchestrator/src/infrastructure/planning/**`
  - `apps/orchestrator/src/workers/planning.ts`

3. D1 — State/Transition Reliability
- Purpose: make transition logic deterministic and test-backed.
- Primary paths:
  - `packages/shared/src/state-machine.ts`
  - `packages/shared/src/**` transition helpers
  - focused tests under `apps/orchestrator/src/**/*.test.ts`

## Task Breakdown

### B1 Tasks

1. Title: Project use-case boundary cleanup
- Scope: ensure routes call use-cases; use-cases call repos/queue via deps.
- Dependencies: Phase 0 docs only.
- Risks: route-level behavior drift.
- Validation: API tests for create/list/get/update/delete projects + enqueue behavior.
- DoD: no business logic in route handler body.

2. Title: Queue contract alignment for project planning kickoff
- Scope: verify `planningQueue.add("plan", payload)` payload fields match planning port contract.
- Dependencies: `docs/contracts/queues.md`.
- Risks: hidden producer mismatch.
- Validation: unit tests on enqueue payload shape.
- DoD: single canonical payload construction path.

### C1 Tasks

1. Title: Planning dependency isolation
- Scope: move direct side effects behind planning deps interfaces.
- Dependencies: none beyond current ports.
- Risks: accidentally changing runtime behavior.
- Validation: planning worker tests, typecheck.
- DoD: planning use-case file has no direct infra imports.

2. Title: Planning event/queue emission consistency
- Scope: normalize `emitTyped` and queue add calls in planning flow.
- Dependencies: `docs/contracts/events.md`, `docs/contracts/queues.md`.
- Risks: event coverage regressions.
- Validation: assertions in planning tests for emitted events and enqueued jobs.
- DoD: event names/payloads match shared event contract.

### D1 Tasks

1. Title: Transition helper consolidation
- Scope: centralize repeated transition checks in shared helpers.
- Dependencies: none.
- Risks: subtle transition permissiveness changes.
- Validation: regression tests for project/workstream/task transitions.
- DoD: one helper module referenced by API + orchestrator.

2. Title: Transition regression suite
- Scope: add table-driven tests for allowed/disallowed transitions.
- Dependencies: helper consolidation.
- Risks: incomplete edge-case coverage.
- Validation: tests include current statuses used in code paths.
- DoD: failing test reproduced for at least one previously-unguarded transition edge case (if exists).

## Dependency Graph

- B1: independent of C1/D1 except shared contracts (read-only)
- C1: independent of B1; reads shared contracts
- D1: may be consumed by C1 if imports are changed to shared helpers

Preferred order:
1. D1 helper API finalized early
2. B1 and C1 merge independently
3. any D1 follow-up adaptation PRs

## Parallelization Opportunities

- B1 and C1 can run fully in parallel (disjoint paths).
- D1 can run in parallel but should publish helper signatures early in PR description.

## Merge Order

1. D1 if it introduces new helper surface consumed by others; otherwise any order.
2. B1 and C1 (whichever is ready first).
3. Post-merge contract/coverage pass.

## Validation / QA Plan

Per stream required checks:
1. typecheck relevant workspace
2. run targeted tests for touched domain
3. verify no forbidden import boundary violations

Cross-stream checks after merge:
1. smoke test project create -> planning enqueue -> planning worker trigger
2. smoke SSE events for project planning lifecycle

## Rollback Considerations

- Keep PRs small and domain-scoped so reverts are isolated.
- If queue/event mismatch detected, revert producer-side change first, then worker-side fix.
- Avoid multi-stream squash commits; preserve stream-level history.

## Assumptions

- Existing in-flight repository changes are intentional and remain untouched.
- No immediate requirement for microservice split.
- BullMQ queue names remain `planning`, `implementation`, `validation`.

## Agent Briefs

- B1: `docs/agent-briefs/batch1-b1-api-projects.md`
- C1: `docs/agent-briefs/batch1-c1-orchestrator-planning.md`
- D1: `docs/agent-briefs/batch1-d1-shared-transitions.md`
- Launch checklist: `docs/plans/batch-1-launch-checklist-2026-04-01.md`
