# End-to-End Product Flow Audit

Date: 2026-03-31
Scope: Current codebase state (`apps/api`, `apps/orchestrator`, `apps/web`, `packages/db`, `packages/shared`).

---

## 1) Company creation

**Status:** missing

**Entry points**
- No API route for company/organization creation.
- No UI route/form for company setup.
- No DB table for companies/organizations.

**Backend path / DB / UI**
- Data model starts at `projects`, `workstreams`, `agent_tasks`, `features` only.
- Project creation is the first top-level entity exposed to users.

**Exact problems**
- There is no tenant boundary (`company_id`) on projects/tasks/workstreams.
- Ownership and isolation semantics are undefined (single-user implied, but not explicit).
- Reporting cannot roll up by company because the primitive does not exist.

**Recommended fix**
- Add `companies` table and `company_id` foreign key to top-level entities.
- Add `/api/companies` CRUD and company switch context in web app.
- Enforce company-scoped queries in repositories/services.

---

## 2) Workspace setup

**Status:** missing (for user/product concept), partial (for internal repo execution)

**Entry points**
- User-facing: none (no "create/select workspace" flow in API/web).
- Internal: planning worker resolves local project directory from `repoPath`, cloned `repoUrl`, or `PROJECTS_DIR/<projectId>`.

**Backend path / DB / UI**
- Workspace concept is implicit file system path resolution in planning/implementation workers.
- `projects.repoPath`, `projects.repoUrl`, and `projects.workBranch` act as workspace metadata.
- Web new-project page supports greenfield vs existing repo input, but not reusable workspace profiles.

**Exact problems**
- No explicit workspace state machine (e.g., cloning, indexing, ready, failed).
- No persisted setup diagnostics (clone failure reasons not exposed as workspace records).
- API file browsing assumes generated dir under orchestrator projects directory, which can diverge for `repoPath` projects.

**Recommended fix**
- Introduce `workspaces` entity with lifecycle/status and error fields.
- Attach project to workspace and persist setup events.
- Make file APIs resolve from project effective workspace path (`repoPath` fallback rules) consistently.

---

## 3) Goal creation

**Status:** implemented (single-project goal)

**Entry points**
- Web: `/projects/new` form posts name/goal/provider/projectMode/repo inputs.
- API: `POST /api/projects` with validated schema.
- Secondary: feature board kickoff creates a project from feature.

**Backend path / DB / UI**
- API route validates request then calls `projectService.create`.
- Repository inserts into `projects` with default `draft` status.
- UI redirects to project detail page.

**Exact problems**
- No explicit `project.created` event emission despite event type existing.
- No dedupe/validation against duplicate goals or conflicting repo target.
- Goal context is stored as a single text field; no structured constraints/acceptance criteria.

**Recommended fix**
- Emit `project.created` from create path for observability.
- Add optional structured goal fields (`constraints`, `acceptanceCriteria`, `nonGoals`).
- Add light conflict checks for existing-mode projects (same repoPath+active project).

---

## 4) Goal decomposition into plan/tasks

**Status:** partial

**Entry points**
- API: `POST /api/projects/:id/plan`.
- Service transitions project `draft -> planning`, enqueues planning job.
- Orchestrator planning worker runs architect prompt and parses `<workstreams>` JSON.

**Backend path / DB / UI**
- Planning worker computes project directory, may clone repo/create branch.
- Saves architecture, creates workstreams, queues initial tasks for dependency-free streams, marks project `in_progress`.
- UI surfaces planning/in-progress states and architecture text.

**Exact problems**
- `parseWorkstreams` returns a default workstream when tags are missing, but planning worker has dead branch for "no workstreams block" completion path (transition logic inconsistency).
- `nameToId` map in planning worker is built and never used.
- Dependency references can be names or IDs, but no normalization at write-time; downstream logic does mixed resolution.
- No contract object persistence even though architecture docs discuss contract-first approach.

**Recommended fix**
- Consolidate single behavior for missing/invalid workstreams (either hard fail or deterministic fallback).
- Normalize dependencies to IDs immediately after workstream creation.
- Persist decomposition artifacts (plan JSON, contracts, rationale) in DB for auditability.

---

## 5) Task assignment to agent

**Status:** partial

**Entry points**
- Automatic: planning/unblock logic creates one task per workstream using `assignedAgent` role.
- Manual: `POST /api/tasks` allows direct task creation.

**Backend path / DB / UI**
- Task row stores `role`, prompt, attempts/maxAttempts.
- Implementation queue job includes role/provider/prompt/session metadata.
- UI displays role badge and task attempts in project detail.

**Exact problems**
- Ownership ambiguity: `workstreams.assignedAgent` is free text in DB while `agent_tasks.role` is enum; validation split can drift.
- No explicit ownership handoff metadata (who/why assigned, timestamp, source decision).
- No balancing/policy layer (all assignment is prompt-derived static mapping).

**Recommended fix**
- Make `assignedAgent` enum-typed in DB (or remove duplication and derive from first task role).
- Add assignment metadata fields (`assignedBy`, `assignmentReason`, `assignmentVersion`).
- Add assignment policy module with deterministic fallback and explainability.

---

## 6) Agent run execution through local CLI provider

**Status:** implemented (with operational gaps)

**Entry points**
- Implementation worker processes `implement` jobs.
- Provider factory selects explicit provider, role-map env, or global default.
- OpenCode and Claude providers spawn local CLIs.

**Backend path / DB / UI**
- Task transitions queued -> running -> completed/failed.
- System prompt built from role + project architecture.
- Retry uses exponential backoff and may reuse provider session ID.
- UI consumes SSE events for started/completed/failed updates.

**Exact problems**
- No provider health preflight (missing CLI/auth discovered only at runtime failure).
- No timeout/circuit-breaker around provider child process execution.
- Error normalization is inconsistent between providers; metadata largely opaque to API/UI.
- Manual retry API does not carry provider override/session continuity info.

**Recommended fix**
- Add startup/runtime provider diagnostics endpoint and health checks.
- Enforce per-task execution timeout with kill + classified failure reason.
- Normalize provider telemetry schema (duration, tokens, cost, failure type, raw stderr).
- Extend retry endpoint to accept provider override and optional resume session.

---

## 7) Artifact generation and storage

**Status:** partial

**Entry points**
- Agents write directly to filesystem project directory.
- Implementation worker snapshots before/after to infer modified files.
- API exposes file tree/content under project path.

**Backend path / DB / UI**
- `agent_tasks.filesModified` stores relative modified file list.
- UI shows modified files per task and browsable project files.

**Exact problems**
- Artifact metadata not first-class (no artifacts table/version/checksum/producer linkage beyond task row array).
- File API path resolution is tied to `PROJECTS_DIR/<projectId>` and may not match existing-project `repoPath` location.
- No retention policy or storage abstraction (local disk only, no archival index).
- Binary/large files are inaccessible in UI with no download or signed-url alternative.

**Recommended fix**
- Add `artifacts` table with path, hash, mime, size, producing task, createdAt.
- Resolve file API using project effective directory logic shared with workers.
- Add artifact storage adapter (local/S3) and retention controls.
- Add raw download endpoint and richer handling for large/binary assets.

---

## 8) Review / approval / reject / retry

**Status:** partial (retry only implemented)

**Entry points**
- Retry: `POST /api/tasks/:id/retry` + UI retry button on failed tasks.
- Review/approval/reject: no dedicated endpoints, states, or UI actions.

**Backend path / DB / UI**
- Retry resets failed task to queued and re-enqueues.
- No review state on task/workstream/project.
- No human approval gate before unblocking dependent workstreams.

**Exact problems**
- Missing explicit review step causes auto-progression from task completion to downstream execution.
- No rejection semantics distinct from failure (quality vs runtime failure conflated).
- No audit trail for human decisions.

**Recommended fix**
- Add review states (`awaiting_review`, `approved`, `rejected`) and reviewer metadata.
- Introduce optional manual approval gate per workstream/project mode.
- Add endpoints/UI for approve/reject with comments and decision history.

---

## 9) Blocked task escalation

**Status:** broken/partial

**Entry points**
- Workstream statuses include `blocked`, but core flow does not set blocked state for dependency deadlocks or unresolved external blockers.
- Current failure path marks workstream `failed` when any task fails.

**Backend path / DB / UI**
- `unblockDependents` checks pending/blocked streams and dependency completion.
- No escalation event type, no escalation queue, no UI CTA for unblock/escalate owner.

**Exact problems**
- Blocked is effectively unused as a semantic state; failure is overloaded.
- No owner routing for escalation (agent vs user vs operator).
- No timeout/SLA detection for "stuck running" or "pending too long" streams.

**Recommended fix**
- Implement blocked transition triggers (dependency failure, external input required, timeout).
- Add escalation model (`escalations` table + events + assignee).
- Surface escalation inbox/alerts in UI and allow acknowledge/resolve actions.

---

## 10) Completion / reporting / dashboard visibility

**Status:** partial

**Entry points**
- Completion determined in progress tracker when all workstreams complete.
- Dashboard home/project pages poll + SSE for status and task/workstream visibility.

**Backend path / DB / UI**
- Project status set to `completed` or `failed` based on workstream aggregate.
- Total cost update only occurs in API `complete` route path, not orchestrator worker completion path.
- UI shows status badges, progress bars, task outputs, files, and activity feed.

**Exact problems**
- Reporting inconsistency: `projects.totalCostUsd` can be stale because orchestrator completion path does not recalc total cost.
- No explicit final report artifact (summary, risks, open issues, test outcomes).
- Dashboard lacks cross-project analytics (throughput, failure rate, retry rate, blocked duration).
- Event stream has no replay/backfill; reconnect loses historical context unless full refetch happens.

**Recommended fix**
- Recompute/update total cost in orchestrator completion path (or DB trigger/materialized view).
- Generate and persist completion report object tied to project.
- Add reporting endpoints + dashboard metrics panels.
- Add event persistence/backfill API for robust real-time UX.

---

## Cross-flow systemic risks

1. **State machine definitions exist but are not centrally enforced in repositories/services.**
2. **Terminology drift (`project` used where product asks for `company/workspace/goal`) leads to ambiguous ownership.**
3. **Documentation and implementation diverge in several places (contract-first/validation/completion semantics).**
4. **Human-in-the-loop control points are minimal, making quality governance weak beyond retries.**

## Priority remediation sequence

1. Introduce tenancy + workspace primitives (`companies`, `workspaces`).
2. Add review/approval workflow and escalation model.
3. Normalize dependency and assignment semantics.
4. Fix artifact/file path consistency for existing repositories.
5. Improve reporting correctness (cost, final reports, event history).
