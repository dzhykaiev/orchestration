# Dependency Rules

Purpose: constrain imports and integration points so parallel agent changes remain local and reviewable.

## Layer Model

For each domain, allowed flow is:

`interfaces -> application -> domain <- infrastructure`

Additional rules:
- `domain` must not import `infrastructure`.
- `application` may depend on ports/interfaces, not concrete adapters.
- `interfaces` should stay thin adapters (HTTP handlers, worker handlers).
- Cross-app deep imports (`apps/api` -> `apps/orchestrator/src/...`) are forbidden.

## App-Level Boundaries

1. `apps/web`
- Can import only from `packages/shared` and API client modules.
- Must not import from `apps/api` or `apps/orchestrator` source trees.

2. `apps/api`
- Can import from `packages/shared` and `packages/db`.
- Must not import runtime internals from `apps/orchestrator`.
- Queue producers must use documented queue contracts in `docs/contracts/queues.md`.

3. `apps/orchestrator`
- Can import from `packages/shared` and `packages/db`.
- Must not depend on API route or HTTP-layer modules.

4. `packages/shared`
- No imports from `apps/*` or `packages/db`.
- Acts as pure shared contract + state machine package.

5. `packages/db`
- No imports from `apps/*`.
- Exposes schema and repositories only.

## Parallel-Agent Safety Rules

1. One PR should not mix ownership areas unless contract handoff is explicit.
2. Contract changes (`packages/shared`, `docs/contracts`) land before adapter refactors.
3. For domain migration, keep temporary barrel exports to prevent broad import churn.
4. No hidden contract changes inside unrelated refactors.

## Enforcement Plan

Phase 0 (now):
- Human review + CODEOWNERS + checklist in PR template.

Phase 1:
- Add static import-boundary check script (`scripts/check-boundaries.*`).
- Run in CI for touched paths.

Assumption: exact lint tooling for boundary checks is still undecided.
