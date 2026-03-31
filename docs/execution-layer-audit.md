# Execution Layer Audit

_Date: 2026-03-31_

## Scope

Inspected how agent runs execute across planning, implementation, and validation workers, with focus on local CLI execution paths (Claude CLI / OpenCode CLI), reliability, security, abstraction boundaries, and observability.

## Quick Architecture Summary

- Execution uses a provider interface (`LLMProvider`) with a factory (`createLLMProvider`) and two concrete providers:
  - `ClaudeProvider`
  - `OpenCodeProvider`
- Workers (`planning`, `implementation`, `validation`) call provider abstractions instead of invoking CLI tools directly.
- Local CLI tools in execution path:
  - `claude`
  - `opencode`
  - `git`

---

## Reliability Issues

1. **Automatic retry path is likely broken**
   - On implementation failure, task is marked `failed`, then retry job is enqueued with same `taskId`.
   - Worker start path requires `queued` status (`markTaskStarted`), so retry jobs for a still-`failed` task are skipped.
   - Manual retry API transitions task back to `queued`, but auto-retry path does not.

2. **No timeout controls around long-running operations**
   - No timeout/abort in provider `run` contract.
   - No child-process kill timer for `claude` / `opencode` invocations.
   - No timeout around `git clone`, branch creation, `git commit`.

3. **Cancellation is partial**
   - `stop()` removes queued/delayed jobs only.
   - Active BullMQ jobs and spawned child processes are not interrupted.

4. **Race potential in progression/unblock flow**
   - Workstream updates are non-conditional updates.
   - With implementation concurrency >1, progress checks and dependency unblocking can race.

---

## Security Issues

1. **Claude provider explicitly bypasses permissions**
   - Uses `--dangerously-skip-permissions`.

2. **Shell-based command assembly in Claude provider**
   - Uses `sh -c` with composed command string.
   - Increases injection surface versus direct arg-array spawn.

3. **Weak filesystem boundary enforcement**
   - `repoPath` from DB is trusted and resolved directly as execution directory.
   - No strict “must be under PROJECTS_DIR” boundary checks.

---

## Abstraction Issues

1. **Provider abstraction exists but is thin and leaky**
   - `RunResult.metadata` is loosely typed provider-specific data.
   - Parsing behavior differs materially between providers (single JSON vs NDJSON events).

2. **Silent fallback on unknown provider names**
   - Non-`claude` explicit provider values fall back to OpenCode.
   - Misconfiguration can pass silently.

3. **`listFiles` in provider interface is not provider-specific behavior**
   - Both providers delegate to shared filesystem utilities.

---

## Observability Issues

1. **No durable, structured per-run audit log**
   - stdout/stderr captured in memory, but not persisted as a first-class run record.

2. **Event delivery can be lossy under pressure**
   - Event bus has bounded in-memory buffer; overflow drops events.

3. **Inconsistent error surfaces**
   - Errors are largely stringified stderr/stdout.
   - OpenCode “error” events can be captured in metadata without forcing failure when exit code is 0.

---

## Missing Capabilities

1. **True cancellation propagation**
   - Need cancellation tokens / AbortSignal through workers and provider adapters.
   - Need child process termination for active runs.

2. **Execution timeout budgets**
   - Per phase/provider timeout policies with deterministic failure mode.

3. **Safe resumability guarantees**
   - Session resume exists, but retry-state transitions are not coherently enforced for auto-retry.

4. **Filesystem policy enforcement**
   - Restrict execution roots and validate/sanitize project paths.

5. **Stronger structured result contracts**
   - Schema-validated result extraction for implementation/validation outcomes.

---

## Requested Checklist Mapping

- Provider abstraction quality: **Moderate** (good start, needs stronger contracts)
- Claude/OpenCode logic isolated behind adapters: **Mostly yes**
- Timeout handling: **Insufficient**
- Cancellation handling: **Partial**
- Retry handling: **Manual retry works; auto-retry likely broken**
- stdout/stderr capture: **Captured, weakly audited**
- Structured result parsing: **Basic, provider-specific**
- Error surfaces: **Inconsistent, string-heavy**
- Filesystem boundaries: **Weak**
- Sandbox assumptions: **Permissive in Claude path**
- Concurrency handling: **Some guards, but race windows remain**
- Logging/auditability: **Basic; not for deep forensics**
- Resume/retry safety: **Incomplete**
