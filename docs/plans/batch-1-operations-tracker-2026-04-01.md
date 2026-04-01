# Batch 1 Operations Tracker — 2026-04-01

Operational tracker for running B1/C1/D1 in parallel with predictable handoffs.

## Scope

Tracks execution only for:
- B1 API projects domain normalization
- C1 orchestrator planning normalization
- D1 shared transition hardening

## Ownership Snapshot

- B1 owner: API architect/agent
- C1 owner: Orchestrator architect/agent
- D1 owner: Shared reliability architect/agent
- Integrator: reviewer who performs cross-stream smoke checks

Assumption: one owner per stream at any given time. Shared pair/mob sessions are out of scope.

## Stream Board

| Stream | Status | Branch | PR | Depends On | Ready To Merge | Notes |
|---|---|---|---|---|---|---|
| D1 | In review | `refactor/d1-shared-transitions` | TBD | A1 baseline docs | Yes (local checks pass) | Shared typed transition helpers + regression tests added |
| B1 | In review | `refactor/b1-api-projects` | TBD | A1 baseline docs | Yes (local checks pass) | Canonical `plan` payload builder + API route test assertions |
| C1 | In review | `refactor/c1-orchestrator-planning` | TBD | A1 baseline docs (+ D1 API if consumed) | Yes (local checks pass) | Planning runtime side effects moved behind dependencies |

Status values: `Not started`, `In progress`, `Blocked`, `In review`, `Merged`.

## Latest Update

- 2026-04-01: D1 implementation started and validated locally.
- Added canonical typed transition helpers in `@orchestration/shared`.
- Adopted helpers in API/orchestrator transition dependency wiring.
- Added table-driven transition regression tests in orchestrator.
- 2026-04-01: B1 partial implementation validated locally.
- Introduced canonical `plan` queue payload builder and adopted in project + feature kickoff paths.
- Added explicit payload-shape assertions in API route tests for `projects` and `features` kickoff flows.
- 2026-04-01: C1 incremental boundary refactor validated locally.
- Moved project directory resolution and git branch checkout from planning use-cases to infrastructure dependencies.
- 2026-04-01: C1 planning contract coverage expanded.
- Added explicit test assertions for planning queue payload and emitted lifecycle events (`project.planning_started`, `workstream.started`, `task.queued`, `project.planning_completed`).
- Added planning regression coverage for empty planner output (direct completion) and no-workstream-created path (`project.failed` emission).
- 2026-04-01: E1 bootstrapped locally (pre-merge).
- Added `scripts/check-boundaries.sh` and root script `check:boundaries`; local run is passing.
- 2026-04-01: E1 contract gate completed locally.
- Added root script `test:contracts` (boundary check + targeted contract tests).
- Added contract test scaffolds for queue payload and event bus envelope/channel.
- Added lightweight CI job `.github/workflows/contracts-gate.yml` with rollback toggle via `ENABLE_CONTRACT_GATES=false`.
- 2026-04-01: Step 2 coordination protocol applied.
- PR template check confirmed in `.github/PULL_REQUEST_TEMPLATE/batch-stream.md`.
- Stream lifecycle statuses advanced to `In review` in this tracker (`D1/B1/C1`).
- 2026-04-01: Step 3 contract expansion completed for E1 gate.
- Added coverage for `task.queued` + `project.planning_completed` event payloads.
- Added queue runtime defaults contract test (`planning|implementation|validation` attempts/concurrency).

## Handoff Contract (Required in Each PR)

Every stream PR must include:
1. Contract touchpoints
- queues/events/state helpers changed or confirmed unchanged.
2. Impact statement
- exact runtime behavior intended to stay stable vs intentionally changed.
3. Validation evidence
- commands run and pass/fail outcome.
4. Consumer guidance
- any follow-up required by other streams.

## Blocker Protocol

If a stream is blocked by another stream:
1. Mark stream status as `Blocked`.
2. Open/append a blocker note in PR description with owner + required artifact.
3. Continue with non-blocked tasks in owned paths.

Assumption: no emergency hotfix takes priority over this batch.

## Merge Window Protocol

1. D1 opens first and publishes helper API intent.
2. B1 and C1 can merge independently if they do not consume new D1 API.
3. If B1/C1 consume D1 helper API, D1 merges first.
4. Integrator runs cross-stream smoke checks after last merge.

## Final Integration Checklist

1. `pnpm -r typecheck` (or workspace-equivalent subset) succeeds.
2. Targeted domain tests for B1, C1, D1 pass.
3. Contract docs remain aligned:
- `docs/contracts/events.md`
- `docs/contracts/queues.md`
- `docs/contracts/contract-registry.md`
4. Smoke flow verified:
- create project -> planning queue job -> planning worker -> planning lifecycle events.

## Daily Sync Template (Async)

Post one short update per stream:
- Yesterday: completed outcomes
- Today: planned outcomes
- Risk: blocker or drift risk
- Need: concrete dependency from another stream
