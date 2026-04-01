# Agent Playbooks

Operational runbook for parallel coding agents.

Batch-specific protocol:
- `docs/parallel-execution/agent-playbooks/batch1-coordination-protocol.md`
- PR template: `.github/PULL_REQUEST_TEMPLATE/batch-stream.md`

## Preconditions

1. Pull latest mainline and re-check ownership map.
2. Confirm target files are in your owned path set.
3. Read contract docs before touching queue/event/payload/state logic.

Required references:
- `docs/ownership/module-owners.md`
- `docs/architecture/dependency-rules.md`
- `docs/contracts/contract-registry.md`

## Standard Agent Workflow

1. Pick one scoped task (single domain or single contract change).
2. Implement only within owned paths.
3. Run focused validation for touched area.
4. Update docs when contracts/behavior change.
5. Open PR with explicit dependency and merge order notes.

## PR Checklist (Short)

- Scope matches ownership map.
- No forbidden cross-layer imports.
- Contracts updated when payload/state/queue behavior changed.
- Tests updated for touched behavior.

## Escalation

If task requires multi-owner changes:
1. split into two PRs where possible,
2. merge contract/boundary PR first,
3. rebase implementation PR onto it.
