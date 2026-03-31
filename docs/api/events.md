# SSE Events

Real-time event stream using Server-Sent Events.

## Connect

```http
GET /api/events
```

Returns a `text/event-stream` response. Keep the connection open to receive real-time updates.

## Usage

### Browser (EventSource)

```javascript
const events = new EventSource('http://localhost:3001/api/events');

events.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.type, data);
};

events.onerror = () => {
  console.log('Connection lost, reconnecting...');
};
```

### curl

```bash
curl -N http://localhost:3001/api/events
```

## Event Format

```
data: {"type":"task.completed","timestamp":"2026-03-31T10:06:30Z","data":{"taskId":"uuid","projectId":"uuid"}}

data: {"type":"workstream.status_changed","timestamp":"2026-03-31T10:06:31Z","data":{"workstreamId":"uuid","from":"in_progress","to":"completed"}}
```

## Event Types

See [Event System](/events) for the full list of event types and their payloads.

## Redis Pub/Sub

Under the hood:
1. Orchestrator workers publish events to a Redis channel (`EVENTS_CHANNEL`)
2. API server subscribes to the channel
3. API server forwards events to all connected SSE clients

This decouples the event producer (orchestrator) from consumers (dashboard clients).
