# State Model Audit

## Scope audited
This audit covers how statuses are modeled and updated for:
- task status (`agent_tasks.status`)
- agent run lifecycle (as represented by queue + task row)
- workflow status (`workstreams.status`, `projects.status`)
- approval/review status (no dedicated model found)

## 1) Current state model (as implemented)

### Task status
Canonical enum values are:
- `queued`
- `running`
- `completed`
- `failed`
- `cancelled`

Defined in DB schema and shared types/schemas. Transition map exists in `packages/shared/src/state-machine.ts`.

Observed writes:
- create task => `queued`
- worker start => `running` (guarded from `queued` only)
- completion endpoint/worker => `completed` (unguarded; can overwrite any status)
- failure endpoint/worker => `failed` (unguarded; can overwrite any status)
- project stop => `cancelled` (unguarded; affects all tasks in project)
- retry => `failed -> queued`

### Agent run status (implicit)
There is no separate `agent_runs` table or explicit run-state enum. Run lifecycle is inferred from:
- BullMQ job existence/state
- task row fields (`status`, `attempts`, `startedAt`, `completedAt`, `error`)
- in-memory `sessionId` threading for retry in implementation worker

This means run state is partially persisted and partially transient.

### Workflow status
There are two workflow layers.

**Project status enum**:
- `draft`, `planning`, `in_progress`, `completed`, `failed`, `cancelled`, `archived`

**Workstream status enum**:
- `pending`, `blocked`, `in_progress`, `completed`, `failed`

Observed lifecycle:
- `project.plan()` CAS-transitions `draft -> planning`, then enqueues planning job
- planning worker sets `planning` again, creates workstreams/tasks, then sets project `in_progress`
- completion logic sets workstream `completed`/`failed`, may unblock dependents
- project completion is derived from aggregate workstream statuses
- stop sets project `cancelled`, tasks `cancelled`, and workstreams `failed`

### Approval status
No dedicated approval state model exists in DB schema, shared types, or service APIs.

There is `workstreams.validationStatus` (`pass|fail|error`) and optional validation worker, but this is QA validation output, not approval workflow state. There is no `approval` entity, no `waiting_review`, and no human decision state.

## 2) Problems in current design

### Missing statuses
- No explicit `timed_out` for tasks or workstreams.
- No explicit `retrying` / `scheduled_retry` for tasks.
- No explicit `stalled` / `abandoned` for jobs that were queued but never executed.
- No `blocked` at task level (only workstream level).
- No review/approval statuses: `waiting_review`, `waiting_human`, `approved`, `rejected`, `changes_requested`.

### Inconsistent status semantics/names
- Project stop marks workstreams as `failed`, conflating user cancellation with execution failure.
- Validation emits `workstream.completed` event from validation worker even though workstream status was already set to `completed` before validation; the event name mixes execution completion vs validation completion.
- Dependencies in workstreams are typed as UUIDs in create schema but runtime allows names as dependencies too (mixed identity semantics).

### Invalid transitions accepted at write layer
`TASK_TRANSITIONS` exists but is not enforced in repository writes.
- `markTaskCompleted` updates by task id only (can mutate `failed`, `cancelled`, etc. to `completed`).
- `markTaskFailed` updates by task id only (can mutate `completed` to `failed`).
- `cancelTasksByProject` overwrites all tasks regardless of terminal state.
- `updateWorkstream` and `updateProject` accept arbitrary status updates without transition guards.

### Impossible / contradictory states reachable
- Task can be `completed` while `error` still contains old failure text (retry does not clear all fields).
- Task can become `completed` after cancellation if a running worker finishes and writes completion.
- Workstream can be `completed` with `validationStatus = fail` because validation does not transition workstream status.
- Project can be `completed` while some workstreams have failed validation (`validationStatus=fail`) because completion checks only `workstream.status`.

### Race conditions and non-atomic updates
- Planning CAS in API (`draft->planning`) is good, but planning worker later unconditionally writes statuses; duplicate/stale jobs may still mutate state.
- Stop flow is multi-step and non-transactional (cancel tasks, cancel workstreams, remove queued jobs, set project status). Concurrent worker writes can interleave.
- Workstream unblocking iterates and creates tasks in multiple statements with no lock/transaction; concurrent completions can queue duplicate downstream tasks.
- Task completion side effects (task status update, cost rollup, workstream/project progression) are split across places and not atomic.

### Status/side-effect divergence
- Worker path marks task completed/failed but does **not** call `projectRepo.updateTotalCost`; API `/tasks/:id/complete` does. Cost can drift from actual task outcomes.
- Event emission is not transactional with DB updates; event can be emitted without durable state (or state can change without event on failure path).
- Validation path can update `validationStatus` and emit events without aligning workflow status gates.

### Missing cancellation / timeout / retry handling gaps
- No timeout enforcement in worker handlers around LLM calls.
- Retry policy exists for implementation errors, but no persisted retry scheduling status and no dead-letter / terminal timeout category.
- Stop removes waiting/delayed jobs but not already-active jobs; active jobs can still write terminal states after cancellation.
- No idempotency keys/guards for enqueueing dependent tasks.

### Missing `blocked` / `waiting_review` / `waiting_human`
- `blocked` exists only for workstreams and is underused (planning initializes pending; progress only checks deps, no external blocker reason model).
- No review/human-gate states at task, workstream, or project level.

## 3) Recommended canonical state machines

### Task (agent execution unit)
Suggested states:
- `queued`
- `running`
- `retry_scheduled`
- `waiting_review`
- `waiting_human`
- `completed`
- `failed`
- `cancelled`
- `timed_out`

Allowed transitions:
- `queued -> running|cancelled|timed_out`
- `running -> completed|failed|retry_scheduled|waiting_review|waiting_human|cancelled|timed_out`
- `retry_scheduled -> queued|cancelled|timed_out`
- `waiting_review -> completed|failed|waiting_human|cancelled`
- `waiting_human -> queued|failed|cancelled`
- terminal: `completed|failed|cancelled|timed_out`

Required metadata:
- `failureReasonCode`, `retryAt`, `cancelledAt`, `timedOutAt`, `runId` (current active run), `version` (optimistic lock).

### Agent run (separate from task)
Create `agent_runs` table; one task can have many runs.

Suggested states:
- `created`
- `queued`
- `running`
- `succeeded`
- `failed`
- `cancel_requested`
- `cancelled`
- `timed_out`

Rules:
- only one run may be `queued|running|cancel_requested` per task (partial unique index)
- task terminal state is derived from latest run + policy
- store provider/session/cost/log pointers per run for auditability

### Approval
Create first-class `approvals` model tied to task/workstream.

Suggested states:
- `not_required`
- `pending` (requested)
- `waiting_human`
- `approved`
- `changes_requested`
- `rejected`
- `expired`

Rules:
- `waiting_review` task requires approval row in `pending|waiting_human`
- `approved` allows continuation/completion
- `changes_requested` transitions task back to `queued` with incremented review iteration

## 4) Concrete file-level recommendations

1. **Enforce transition guards in write paths.**
   - Apply transition assertions in repository functions or DB `WHERE status IN (...)` guards for every status mutation.
   - Files: `packages/db/src/repositories/tasks.ts`, `packages/db/src/repositories/workstreams.ts`, `packages/db/src/repositories/projects.ts`, `packages/shared/src/state-machine.ts`.

2. **Make task terminal writes conditional and idempotent.**
   - `markTaskCompleted`/`markTaskFailed` should require `status='running'` and update `completedAt`/`error` coherently.
   - Avoid overwriting terminal states.
   - File: `packages/db/src/repositories/tasks.ts`.

3. **Separate cancellation from failure for workstreams/projects.**
   - Add `cancelled` to `workstream_status` enum and use it in stop flow.
   - Keep `failed` for execution errors only.
   - Files: `packages/db/src/schema.ts`, migration files, `apps/api/src/services/project.service.ts`, `apps/orchestrator/src/tracking/progress.ts`.

4. **Unify cost rollup side effects.**
   - After worker task completion/failure transitions, call cost rollup in same transactional flow (or move to DB trigger/materialized aggregate job).
   - Files: `apps/orchestrator/src/workers/implementation.ts`, `packages/db/src/repositories/projects.ts`, `apps/api/src/services/agent.service.ts`.

5. **Introduce transactional orchestration step for progress updates.**
   - Wrap: task terminal update -> workstream aggregate update -> project aggregate update -> enqueue dependents in a transaction/outbox pattern.
   - Files: `apps/orchestrator/src/tracking/progress.ts`, `packages/db/src/repositories/*`.

6. **Add explicit run model (`agent_runs`).**
   - Persist each attempt as a run; move retry/session/error/cost to run records.
   - Keep task as policy/summary status.
   - Files: `packages/db/src/schema.ts`, new repo module, `apps/orchestrator/src/workers/implementation.ts`, `apps/api/src/services/agent.service.ts`.

7. **Add timeout and cancel-request handling.**
   - Configure per-job timeouts and handle `cancel_requested` checks before final writes.
   - Ensure active jobs observe project cancellation.
   - Files: `apps/orchestrator/src/index.ts`, `apps/orchestrator/src/workers/implementation.ts`, `apps/api/src/services/project.service.ts`.

8. **Create approval workflow primitives.**
   - New `approvals` table + API endpoints + status integration (`waiting_review`, `waiting_human`).
   - Files: `packages/db/src/schema.ts`, `packages/shared/src/types/*`, `packages/shared/src/schemas/*`, `apps/api/src/routes/*`, `apps/orchestrator/src/tracking/progress.ts`.

9. **Normalize dependency identity model.**
   - Store dependencies strictly as workstream IDs (or strictly names) and validate consistently.
   - Files: `packages/shared/src/schemas/workstream.ts`, `apps/orchestrator/src/workers/planning.ts`, `apps/orchestrator/src/tracking/progress.ts`.

10. **Adopt outbox for status+event consistency.**
   - Persist domain events transactionally with status changes and publish asynchronously.
   - Files: `apps/orchestrator/src/events/*`, repositories that mutate status.
