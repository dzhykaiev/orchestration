# Batch 1 Launch Checklist — 2026-04-01

Use this before starting parallel coding streams.

## Preconditions

1. Phase 0 guardrails present:
- `docs/contracts/events.md`
- `docs/contracts/queues.md`
- `docs/contracts/contract-registry.md`
- `docs/architecture/dependency-rules.md`
- `docs/ownership/module-owners.md`
- `.github/CODEOWNERS`

2. Batch plan present:
- `docs/plans/batch-1-execution-2026-04-01.md`

3. Agent briefs present:
- `docs/agent-briefs/batch1-b1-api-projects.md`
- `docs/agent-briefs/batch1-c1-orchestrator-planning.md`
- `docs/agent-briefs/batch1-d1-shared-transitions.md`

## Start Sequence

1. Start D1 (publish helper API intent early in PR description).
2. Start B1 and C1 in parallel against same baseline.
3. Re-run quick contract sanity check before merge.

## Merge Gates

1. Ownership boundaries respected.
2. Targeted typecheck/tests passed per stream.
3. No contract drift from docs/contracts.
4. No cross-app forbidden imports.

## Post-Merge

1. Run cross-stream smoke flow:
- create project -> planning queue -> planning worker -> emitted planning events
2. Capture follow-up tasks for E1 (automated boundary checks + contract tests).
