# Batch 1 Next Steps — 2026-04-01

This is the immediate execution sequence after planning artifacts are prepared.

## Step 1 — Launch Streams (No Scope Expansion)

Launch D1, B1, C1 using existing briefs:
- `docs/agent-briefs/batch1-d1-shared-transitions.md`
- `docs/agent-briefs/batch1-b1-api-projects.md`
- `docs/agent-briefs/batch1-c1-orchestrator-planning.md`

Constraint: no stream may extend into E1 (CI hardening) during Batch 1.

## Step 2 — Enforce Coordination Protocol

Apply protocol:
- `docs/parallel-execution/agent-playbooks/batch1-coordination-protocol.md`
- `docs/plans/batch-1-operations-tracker-2026-04-01.md`

Update tracker status at least once per PR lifecycle stage:
- `Not started` -> `In progress` -> `In review` -> `Merged`.

## Step 3 — Integrate and Validate

After merges complete:
1. Run stream-level tests/typecheck checks.
2. Run cross-stream smoke flow.
3. Record residual issues for E1 backlog.

## Step 4 — Prepare E1 Entry

Only after Batch 1 merge stability:
1. Define CI boundary check script scope.
2. Add contract test skeleton for events/queues.
3. Propose minimal CI gates to avoid pipeline flakiness.

Assumption: repository already has enough test runtime budget for one additional lightweight gate in E1.

Artifacts:
- `docs/agent-briefs/e1-contracts-ci.md`
- `docs/plans/e1-scope-2026-04-01.md`
