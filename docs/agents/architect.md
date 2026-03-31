# Architect Agent

The Architect is the first agent to run. It receives the user's goal and produces a complete system design that all other agents implement.

## Responsibility

- Design system architecture from a high-level goal
- Define all shared types in `packages/shared/src/types/`
- Create API contracts in `packages/shared/src/schemas/`
- Define event contracts in `packages/shared/src/types/events.ts`
- Document database entity-relationship model
- Create workstream plan with dependencies and deliverables

## Output

The architect produces a structured plan containing:

| Output | Description |
|--------|-------------|
| **Components** | System components and their responsibilities |
| **Data Models** | Entity types, fields, relationships |
| **API Contracts** | Endpoint definitions with request/response shapes |
| **File Structure** | Directory layout for the generated project |
| **Workstreams** | Parallel work tracks with scoped tasks |
| **Dependencies** | Which workstreams depend on which |
| **Deliverables** | Expected output for each workstream |

## Owned Paths

```
packages/shared/src/types/    # Entity type definitions
packages/shared/src/schemas/  # API DTO schemas/contracts
packages/shared/src/types/    # Event contracts (events.ts)
```

## Constraints

- Every entity type must be defined as a TypeScript interface
- Every API endpoint must have typed request and response shapes
- No `any` types allowed
- Contracts must be complete enough that implementation agents don't need to guess
- Workstreams must have clear scope boundaries — no overlapping file ownership

## When It Runs

```
POST /api/projects/:id/plan
         │
         ▼
   Planning Queue (concurrency: 1)
         │
         ▼
   Architect Agent
         │
         ├── Creates contracts
         ├── Creates workstreams
         └── Enqueues implementation tasks
```

The architect runs once per project, before any implementation begins.
