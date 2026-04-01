# Brief — E1 Contracts CI Hardening

## Mission

Add lightweight automated checks that prevent architectural boundary drift and contract regressions.

## Scope (Phase E1)

Allowed paths:
- `scripts/**` (boundary/contract validation scripts)
- CI workflow files (for example `.github/workflows/**`)
- contract-focused test files under app/shared test directories
- test/config files needed to wire checks (for example Vitest/Jest config if required)

Out of scope:
- business logic refactors in API/orchestrator/web
- queue runtime behavior changes

## Inputs

Read first:
- `docs/contracts/events.md`
- `docs/contracts/queues.md`
- `docs/contracts/contract-registry.md`
- `docs/architecture/dependency-rules.md`
- `docs/plans/batch-1-execution-2026-04-01.md`

## Required Outcomes

1. Static boundary check script exists and fails on forbidden imports.
2. Contract test skeleton exists for queue/event payload surface.
3. CI includes one stable, low-cost gate for boundary/contracts checks.

## Quality Gates

1. Deterministic checks (no flaky network/runtime dependencies).
2. Fast execution target suitable for PR gating.
3. Actionable failure output (clear file and rule that failed).

## Risks to Avoid

- Over-scoped CI changes that slow all pipelines.
- Hardcoding brittle file paths without ownership awareness.
- False positives that block merges without real violations.

## Definition of Done

- Boundary checker documented and executable in CI.
- Contract test scaffold committed with at least one meaningful assertion.
- CI gate adopted with rollback toggle strategy documented.

Assumption: CI environment already has package manager/toolchain required by existing test pipeline.

