# Agent Parallel Execution Plan — 2026-04-01

## Goal

Run incremental architecture refactor in parallel with minimal merge conflicts and predictable integration order.

## Path Ownership (Hard Boundaries)

- Agent A (Contracts + Guardrails)
  - Owns: `docs/architecture/**`, `docs/contracts/**`, `docs/decisions/**`, `contracts/**`
- Agent B (API Refactor)
  - Owns: `apps/api/src/application/**`, `apps/api/src/infrastructure/**`, `apps/api/src/services/**`, `apps/api/src/routes/**`
- Agent C (Orchestrator Refactor)
  - Owns: `apps/orchestrator/src/application/**`, `apps/orchestrator/src/infrastructure/**`, `apps/orchestrator/src/workers/**`, `apps/orchestrator/src/events/**`, `apps/orchestrator/src/tracking/**`
- Agent D (State/Transitions Reliability)
  - Owns: `packages/shared/src/**`, targeted tests under `apps/orchestrator/src/**/*.test.ts`
- Agent E (Contracts CI)
  - Owns: `apps/*/src/**/__tests__/**`, `vitest.config.ts`, CI workflow files, validation scripts in `scripts/**`

## Dependency Rules

- Cross-agent changes to foreign paths are not allowed without explicit handoff.
- Shared integration points:
  - `packages/shared` types/contracts
  - `docs/contracts` queue/event specs
- If a contract changes, Agent A approves and publishes contract delta first.

## Integration Sequence

1. Merge Agent A baseline docs/contracts.
2. Merge Agents B, C, D in parallel batches against A baseline.
3. Merge Agent E after B/C/D to harden checks around finalized contracts.

## PR Slice Size

- Recommended max per PR: 8-15 files, <= 400 LOC net where possible.
- One domain/module per PR (e.g. only `projects`, only `planning`).

## Definition of Done per Agent

- Typecheck passes for affected workspace(s).
- Tests pass for touched domain.
- No forbidden imports by dependency rules.
- Docs updated if contract or behavior changes.

## First Parallel Batch

- A1: Add `docs/contracts/events.md` + `docs/contracts/queues.md` + dependency matrix doc.
- B1: Normalize `apps/api` domain `projects` module (ports/use-cases/dependencies/routes).
- C1: Normalize `apps/orchestrator` domain `planning` module.
- D1: Centralize transition helpers and add transition regression tests.
- E1: Add static check script for import boundaries + contract test skeleton.

## Status Checkpoint

- A1 completed:
  - `docs/contracts/events.md`
  - `docs/contracts/queues.md`
  - `docs/contracts/contract-registry.md`
  - `docs/architecture/dependency-rules.md`
  - `docs/ownership/module-owners.md`
  - `docs/parallel-execution/agent-playbooks/README.md`
  - `.github/CODEOWNERS`
- Batch 1 operations docs completed:
  - `docs/plans/batch-1-operations-tracker-2026-04-01.md`
  - `docs/parallel-execution/agent-playbooks/batch1-coordination-protocol.md`
  - `docs/plans/batch-1-next-steps-2026-04-01.md`
- E1 prep docs completed:
  - `docs/agent-briefs/e1-contracts-ci.md`
  - `docs/plans/e1-scope-2026-04-01.md`
- Next critical path: run B1 + C1 + D1 in parallel on top of these guardrails.
