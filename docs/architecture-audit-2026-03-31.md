# Architecture Audit — Autonomous Multi-Agent Orchestration Platform

_Date: March 31, 2026_

## 1) Repo map

- **apps/api** — Fastify API, REST routes, SSE stream, Redis/BullMQ integration.
- **apps/orchestrator** — BullMQ workers for planning, implementation, and validation.
- **apps/web** — Next.js UI (projects dashboard/detail + feature board).
- **packages/db** — Drizzle schema and repositories.
- **packages/shared** — shared types/schemas/events/state transitions.

## 2) Current architecture summary

The implemented system is a queue-driven orchestration runtime:

1. API creates/updates entities and enqueues jobs.
2. Orchestrator workers execute jobs and call CLI-based providers.
3. Workers emit events to Redis pub/sub.
4. API SSE endpoint relays events to web clients.

### Domain model in code

- **Project**: goal + provider + repo mode/path + lifecycle status.
- **Workstream**: decomposition unit with dependencies/agent assignment/validation fields.
- **AgentTask**: execution record with role, prompt, status, attempts, output, filesModified, cost.
- **Feature**: board-level backlog item with optional link to orchestration project.

## 3) Implemented product flows

1. Create project (`draft`).
2. Start planning (`draft -> planning` CAS in API path).
3. Planning worker resolves target repo/project directory, runs architect prompt, parses workstreams, creates workstreams + initial tasks.
4. Implementation worker executes tasks via provider, records file diffs, updates task status, unblocks dependents.
5. Optional validation worker runs QA prompt and stores verdict on workstream.
6. Stop/archive/delete project flows exist.
7. Feature board kickoff creates project from feature and enqueues planning.

## 4) Missing or incomplete flows

- No workspace/company/user/auth/multi-tenant model.
- No explicit hierarchy/delegation/escalation graph for agents.
- No persistent `run` / `attempt` entities.
- No persistent immutable audit trail.
- No policy/approval gates for dangerous actions.

## 5) Findings by severity

## Critical

### 1. Retry path is broken (state mismatch)
- **Type**: bug
- **Affected**: implementation worker + task repo
- **Issue**: failed task is re-enqueued without resetting DB status to `queued`; start guard rejects retry.
- **Impact**: transient failures become permanent unless manually repaired.
- **Fix**: transition task `failed -> queued` before enqueue retry (e.g., use repo retry method).

### 2. Cancellation is not authoritative
- **Type**: architectural flaw
- **Affected**: project stop flow + implementation worker
- **Issue**: stop removes waiting jobs and marks DB states, but does not kill currently running provider process.
- **Impact**: cancelled project can continue modifying files.
- **Fix**: introduce cancellation tokens + active process tracking + forced termination.

### 3. Dangerous execution lacks policy gate
- **Type**: architectural flaw
- **Affected**: provider layer + API governance
- **Issue**: provider invokes CLI with dangerous permissions; no approval/auth boundary.
- **Impact**: high security and compliance risk.
- **Fix**: enforce policy/approval checks before privileged operations.

## High

### 4. Validation is not lifecycle-gating completion
- **Type**: architectural flaw
- **Affected**: progress + validation workers
- **Issue**: workstream marked `completed` before validation; project completion ignores validation outcome.
- **Impact**: system can report success while QA verdict is fail/error.
- **Fix**: introduce validation-aware states and completion gate.

### 5. Existing-repo file browsing path mismatch
- **Type**: bug
- **Affected**: API file routes
- **Issue**: files endpoint reads from `projects/<id>` while execution may happen at `repoPath`.
- **Impact**: UI cannot view actual artifacts for existing-mode projects.
- **Fix**: resolve project by id and use repoPath when present.

### 6. No restart reconciliation for running tasks
- **Type**: missing feature
- **Affected**: orchestrator startup/runtime
- **Issue**: crashed runs may stay in `running` forever.
- **Impact**: zombie tasks/workstreams and stuck pipelines.
- **Fix**: startup sweep + heartbeat/lease timeout + safe requeue/fail policy.

### 7. Cost rollup not updated in main worker path
- **Type**: bug
- **Affected**: implementation worker / project cost
- **Issue**: `totalCostUsd` is recomputed only in manual completion API flow, not worker completion.
- **Impact**: inaccurate cost visibility.
- **Fix**: recompute project total after worker task completion.

## Medium

### 8. Dependency model ambiguity (names vs UUIDs)
- **Type**: technical debt
- **Issue**: dependencies are treated as both IDs and names.
- **Impact**: brittle unblock logic.
- **Fix**: canonicalize dependencies to workstream IDs.

### 9. Inconsistent event payload shape
- **Type**: UX issue
- **Issue**: some task events omit projectId; project-filtered SSE leaks unrelated events.
- **Impact**: noisy/incorrect UI updates.
- **Fix**: include projectId in all task events and filter strictly server-side.

### 10. Feature board and orchestration lifecycle are weakly coupled
- **Type**: UX issue
- **Issue**: board status and project/workstream/task lifecycle are not strongly synchronized.
- **Impact**: user confusion about source of truth.
- **Fix**: explicit mapping rules and state sync model.

## Low

### 11. Agent structure is flat, not hierarchical
- **Type**: missing feature
- **Issue**: current model lacks parent/child delegation and escalation semantics.
- **Impact**: cannot fully realize CEO/planner/lead/specialist/reviewer pattern.
- **Fix**: add run graph with parent linkage and escalation states.

### 12. Domain assumptions are software-specific
- **Type**: architectural limitation
- **Issue**: prompts/roles are tightly bound to software delivery workflows.
- **Impact**: harder extension to broader business domains.
- **Fix**: split orchestration core from domain packs.

## 6) Highest priority fixes for next 7 days

1. Fix retry state transition bug.
2. Implement authoritative cancellation of active runs.
3. Add policy/approval checks for risky operations.
4. Add persistent run/attempt entities and durable audit trail.
5. Make validation a real completion gate.
6. Fix existing-mode artifacts/file path resolution.
7. Add startup reconciliation for stale running tasks.

## 7) Suggested target architecture

### Control plane
- workspace, user, membership, RBAC/policy, approval requests.

### Execution plane
- agent_runs (hierarchical), run_attempts, run_artifacts, run_logs, append-only run_events.

### Orchestration engine
- centralized state machine transitions, deterministic dependency resolution (ID-based), robust retry/cancel/recovery semantics.

### Provider adapters
- capability-aware interface (`start`, `resume`, `cancel`, `stream`, `collectArtifacts`) with safety profile per provider.

### Governance
- mandatory approval gates for destructive actions.

### UX model
- unify: Feature (intent) -> Project (initiative) -> Workstreams (plan) -> Runs/Tasks (execution) -> Artifacts (evidence).

## 8) Suggested MVP cuts and deferrals

### Keep in MVP
- single workspace, but include basic user identity + audit + approvals.
- fewer roles, but with true delegation primitives.
- one provider with clean adapter contract including cancellation.
- minimal but explicit artifact/run evidence linking.

### Defer
- multi-provider optimization/fallback routing.
- advanced board mechanics.
- broad multi-domain packs.
- sophisticated planning heuristics.
