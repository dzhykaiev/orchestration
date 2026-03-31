# Batch 1 Brief — D1 Shared Transitions

## Mission

Harden lifecycle transition logic in shared layer and back it with deterministic tests.

## Ownership

You may edit only:
- `packages/shared/src/**` (transition/state-machine related)
- targeted transition tests under `apps/orchestrator/src/**/*.test.ts`

Do not edit API/orchestrator business flows except minimum imports needed by transition helper adoption.

## Inputs

Read first:
- `docs/plans/batch-1-execution-2026-04-01.md`
- `docs/contracts/contract-registry.md`
- `docs/architecture/dependency-rules.md`

## Required Outcomes

1. Centralized helper API for transition checks (project/workstream/task).
2. Table-driven regression tests for allowed/disallowed transitions.
3. Clear failure messages for invalid transitions used by application code.

## Risks to Avoid

- Expanding allowed transitions by accident.
- Scattering transition logic into app-local code.
- Introducing breaking type changes in shared exports.

## Validation

1. Typecheck shared + orchestrator workspaces.
2. Run transition-focused tests.
3. Verify unchanged behavior for existing valid status paths.

## Definition of Done

- One canonical transition helper surface in shared package.
- Regression tests capture core transition matrix.
- No drift between helper behavior and documented state machine.
