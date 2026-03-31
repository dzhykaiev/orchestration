# Queue System

BullMQ job queues backed by Redis. Three queues coordinate the orchestration pipeline.

## Architecture

```
                    ┌──────────────┐
                    │   API Server │
                    └──────┬───────┘
                           │ enqueue
                           ▼
┌──────────┐    ┌──────────────────┐    ┌──────────────────┐
│ Planning │───>│ Implementation   │───>│   Validation     │
│ Queue    │    │ Queue            │    │   Queue          │
│          │    │                  │    │                  │
│ C: 1     │    │ C: 3             │    │ C: 2             │
│ R: 2     │    │ R: 3             │    │ R: 1             │
└──────────┘    └──────────────────┘    └──────────────────┘
     │                   │                      │
     ▼                   ▼                      ▼
 Architect          Implementation             QA
  Agent              Agents                   Agent
```

**C** = concurrency, **R** = max retries

## Queues

### Planning Queue

| Property | Value |
|----------|-------|
| Purpose | Architect agent jobs — one per project |
| Concurrency | 1 (sequential) |
| Priority | Highest — must complete before implementation |
| Retries | 2 with exponential backoff (5s, 30s) |
| Job data | `{ projectId, goal, constraints? }` |

The planning queue is intentionally single-threaded. Only one project is planned at a time to avoid resource contention on the LLM provider.

### Implementation Queue

| Property | Value |
|----------|-------|
| Purpose | Implementation agent jobs — multiple per workstream |
| Concurrency | 3 (parallel agents) |
| Priority | Based on workstream dependency order |
| Retries | 3 with exponential backoff (10s, 60s, 300s) |
| Job data | `{ taskId, workstreamId, prompt, context, outputPath }` |

Each retry includes the error context from the previous attempt, giving the agent a chance to self-correct.

### Validation Queue

| Property | Value |
|----------|-------|
| Purpose | Output validation — one per completed workstream |
| Concurrency | 2 |
| Priority | Normal |
| Retries | 1 |
| Job data | `{ workstreamId, projectId }` |

Validation failures usually indicate an agent output problem, not a transient error.

## Flow

```
POST /api/projects/:id/plan
         │
         ▼
    ┌─────────┐      creates workstreams,
    │ Planning │─────> enqueues implementation
    └─────────┘      tasks for independent
         │           workstreams
         ▼
    ┌────────────────┐
    │ Implementation │──── parallel execution
    │ (up to 3)      │    (per workstream)
    └────────────────┘
         │
         │ on workstream completion
         ▼
    ┌────────────┐
    │ Validation │──── QA checks deliverables
    └────────────┘
         │
         │ PASS/FAIL verdict
         ▼
    workstream.status updated
    if all done → project.completed
```

## Dependency Management

Workstreams can depend on other workstreams. The orchestrator:

1. Creates all workstreams from the architect's plan
2. Enqueues only independent workstreams (no dependencies)
3. When a workstream completes, checks for blocked workstreams that can now start
4. Enqueues newly unblocked workstreams

This ensures correct execution order while maximizing parallelism.

## Retry Strategy

On failure, the orchestrator:

1. Captures the error message and context
2. Adds error context to the retry prompt
3. Re-enqueues the task with incremented attempt count
4. The agent receives: original prompt + "Previous attempt failed because: ..."

After max retries, the task is marked as `failed` and the workstream may be blocked.
