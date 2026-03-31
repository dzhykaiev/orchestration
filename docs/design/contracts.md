# Contract-First Design

Every boundary in the system is defined by an explicit contract before implementation begins.

## What Are Contracts?

Contracts are TypeScript type definitions that specify how components interact. They are the single source of truth for interface boundaries. When two agents need to produce code that interacts, the contract defines what that interaction looks like.

## Types of Contracts

### Shared Entity Types

Defined in `packages/shared/src/types/`. These are the core data structures used across all applications.

```typescript
// Example: Project entity
interface Project {
  id: string;
  name: string;
  goal: string;
  status: ProjectStatus;
  mode: 'greenfield' | 'existing';
  costUsd: string;
  createdAt: string;
  updatedAt: string;
}
```

### API Contracts

Defined in `contracts/api/`. Specify request/response shapes for every API endpoint.

```typescript
// Example: Create Project
interface CreateProjectRequest {
  name: string;
  goal: string;
  mode?: 'greenfield' | 'existing';
  llmProvider?: 'claude' | 'opencode';
}

interface CreateProjectResponse extends Project {}
```

### Event Contracts

Defined in `contracts/events/`. Specify event payloads for real-time updates.

```typescript
// Example: Task completed event
interface TaskCompletedEvent {
  type: 'task.completed';
  timestamp: string;
  data: {
    taskId: string;
    projectId: string;
    workstreamId: string;
    filesModified: string[];
  };
}
```

### Database Schema

Defined in `packages/db/src/schema.ts`. The Drizzle ORM schema is the contract between the application and the database.

### Environment Contract

Defined in `packages/shared/src/types/`. Specifies required environment variables.

## Contract Lifecycle

```
1. Definition    → Architect agent defines contracts
2. Review        → Contracts reviewed for completeness
3. Freeze        → Contracts locked before implementation
4. Implementation → Agents implement against frozen contracts
5. Validation    → QA agent validates output against contracts
```

::: warning Important
Once implementation begins, contracts are frozen. Changing a contract mid-execution would break agent coordination. If a contract is wrong, the project should be re-planned.
:::

## Why Contract-First?

- **Parallel execution** — agents can work simultaneously because they agree on interfaces
- **Predictable output** — agents know exactly what to produce
- **Validation** — QA can check output against contracts automatically
- **Isolation** — agents don't need to see each other's code, only the contracts
