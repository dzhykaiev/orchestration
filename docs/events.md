# Event System

Real-time updates from the orchestrator to the web dashboard via Server-Sent Events (SSE).

## Architecture

```
┌──────────────┐  publish   ┌───────┐  subscribe  ┌─────────────┐
│ Orchestrator │──────────>│ Redis │<────────────│  API Server │
│  (workers)   │           │Pub/Sub│             │  (SSE)      │
└──────────────┘           └───────┘             └──────┬──────┘
                                                        │ SSE
                                                        ▼
                                                 ┌─────────────┐
                                                 │ Web Dashboard│
                                                 │ (EventSource)│
                                                 └─────────────┘
```

## SSE Endpoint

```
GET /api/events
```

Returns a Server-Sent Events stream. The dashboard connects to this endpoint and receives real-time updates as projects, workstreams, and tasks change state.

## Event Types

All events follow the `OrchestratorEvent` union type defined in `packages/shared/src/types/events.ts`.

### Workspace Events

| Event | Trigger |
|-------|---------|
| `workspace.created` | New workspace created |
| `workspace.updated` | Workspace modified |

### Project Events

| Event | Trigger |
|-------|---------|
| `project.created` | New project created |
| `project.updated` | Project modified |
| `project.status_changed` | Project status transition |
| `project.completed` | Project finished successfully |
| `project.failed` | Project failed |

### Workstream Events

| Event | Trigger |
|-------|---------|
| `workstream.created` | New workstream from architect plan |
| `workstream.updated` | Workstream modified |
| `workstream.status_changed` | Status transition |
| `workstream.validated` | QA validation completed |

### Task Events

| Event | Trigger |
|-------|---------|
| `task.created` | New task enqueued |
| `task.started` | Agent begins execution |
| `task.completed` | Agent finished successfully |
| `task.failed` | Agent failed |
| `task.retrying` | Task being retried |

## Event Payload

Each event includes:

```typescript
interface OrchestratorEvent {
  type: string;          // e.g., "project.status_changed"
  timestamp: string;     // ISO 8601
  data: {
    projectId?: string;
    workstreamId?: string;
    taskId?: string;
    // ... event-specific fields
  };
}
```

## Dashboard Integration

The web dashboard uses `EventSource` API to subscribe:

```typescript
const eventSource = new EventSource('/api/events');

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Update UI based on event type
};
```

The dashboard also polls the API for initial state on page load, using SSE only for incremental updates.
