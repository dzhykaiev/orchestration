# Batch 1 Brief — B1 API Projects

## Mission

Normalize `projects` API domain to strict adapter -> use-case -> dependency flow.

## Ownership

You may edit only:
- `apps/api/src/application/projects/**`
- `apps/api/src/infrastructure/projects/**` (if needed)
- `apps/api/src/routes/projects.ts`
- focused tests under `apps/api/src/routes/__tests__/` for project endpoints

Do not edit orchestrator/shared/db contracts in this task.

## Inputs

Read first:
- `docs/plans/batch-1-execution-2026-04-01.md`
- `docs/contracts/queues.md`
- `docs/architecture/dependency-rules.md`
- `docs/ownership/module-owners.md`

## Required Outcomes

1. Routes are thin adapters (no business orchestration in handler body).
2. Project planning enqueue uses one canonical payload builder path.
3. Queue call aligns with `planning` contract (`plan` job with expected payload).

## Risks to Avoid

- Changing HTTP response contracts unintentionally.
- Duplicating enqueue payload construction across files.
- Importing orchestrator internals.

## Validation

1. Typecheck API workspace.
2. Run targeted tests for project routes.
3. Verify create project path enqueues planning job once.

## Definition of Done

- No business logic in `projects` route handlers beyond parsing + delegation.
- One clear use-case path for planning enqueue.
- Tests cover create-project kickoff behavior.
