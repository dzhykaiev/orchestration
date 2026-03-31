# Module Ownership Map

Goal: prevent overlapping edits between coding agents.

## Ownership Table

1. Agent A — Architecture and Contracts
- Owns:
  - `docs/architecture/**`
  - `docs/contracts/**`
  - `docs/decisions/**`
  - `contracts/**`

2. Agent B — API Domains
- Owns:
  - `apps/api/src/application/**`
  - `apps/api/src/infrastructure/**`
  - `apps/api/src/services/**`
  - `apps/api/src/routes/**`

3. Agent C — Orchestrator Domains
- Owns:
  - `apps/orchestrator/src/application/**`
  - `apps/orchestrator/src/infrastructure/**`
  - `apps/orchestrator/src/workers/**`
  - `apps/orchestrator/src/events/**`
  - `apps/orchestrator/src/tracking/**`
  - `apps/orchestrator/src/{delegation,escalation,hierarchy}/**`

4. Agent D — Shared State and Reliability
- Owns:
  - `packages/shared/src/**`
  - targeted tests under `apps/orchestrator/src/**/*.test.ts`

5. Agent E — CI and Contract Validation
- Owns:
  - `apps/*/src/**/__tests__/**`
  - `scripts/**`
  - CI files (`.github/workflows/**` once introduced)
  - root validation config (e.g. `vitest.config.ts`)

## Handoff Rules

1. If task needs foreign path edits, open a handoff note in PR description.
2. Contract owner (Agent A) must review queue/event/shared-type changes.
3. Merge sequence:
- A baseline first
- B/C/D in parallel
- E hardening after B/C/D

## Conflict Policy

- If two streams need same file, split by commit order and rebase after first merge.
- Do not resolve by broad file rewrites; prefer smallest possible patch.
