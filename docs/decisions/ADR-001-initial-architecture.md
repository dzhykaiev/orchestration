# ADR-001: Initial Architecture --- Event-Driven Agent Orchestration

## Status

Accepted

## Date

2026-03-31

## Context

We need to build a system that takes a high-level software goal from a user, designs an architecture for it, and then implements the design using multiple AI agents working in parallel. The key challenges are:

1. **Coordination.** Multiple agents need to work on different parts of a system simultaneously without stepping on each other. They need to produce code that integrates correctly at the boundaries.

2. **Reliability.** LLM API calls are expensive, slow (seconds to minutes per call), and occasionally fail. The system must handle failures gracefully, retry intelligently, and never lose work.

3. **Observability.** The user needs to understand what the system is doing at every step: which agents are active, what they have produced, what has failed and why.

4. **Development velocity.** The system itself needs to be built by a small team (or a single developer). The architecture must support parallel development of its own components without constant coordination overhead.

5. **Simplicity.** This is an MVP. Over-engineering the infrastructure will consume time that should go toward the core orchestration logic and agent quality.

### Alternatives Considered

**Microservices with message broker (e.g., RabbitMQ, Kafka):**
Each agent as a separate service communicating via a message broker. Rejected because the operational overhead of running and debugging multiple services, a message broker, and service discovery is too high for an MVP. The system does not need the scaling properties that microservices provide.

**Monolithic application with in-process threading:**
A single application that spawns threads or async workers for agent tasks. Rejected because it couples the API server to the orchestration logic, makes it hard to restart the orchestrator without restarting the API, and does not provide the job persistence and retry semantics we need.

**Serverless functions (AWS Lambda, Cloudflare Workers):**
Each agent task as a serverless function invocation. Rejected because the local development story for serverless is poor, the cold start latency is problematic for jobs that take minutes, and the MVP is local-only.

**Direct orchestration without a queue:**
The API server directly calls Claude API and manages state inline. Rejected because it blocks HTTP requests for minutes, does not support retries without client cooperation, and tightly couples the request/response cycle to the orchestration lifecycle.

## Decision

We will build a **TypeScript monorepo** with **event-driven orchestration** using **BullMQ/Redis** for job queuing, **PostgreSQL** for persistent state, and a **contract-first design** for inter-component coordination.

### Architecture

The system consists of three applications in a monorepo:

1. **API Server (Fastify):** Accepts user requests, persists data, enqueues jobs, serves status. Stateless.
2. **Orchestrator (BullMQ workers):** Consumes jobs from queues, runs agent logic (Claude API calls), writes files, updates status. Stateful in terms of job processing, but all state is externalized to PostgreSQL and Redis.
3. **Web Dashboard (Next.js):** User interface that communicates exclusively through the API server.

Plus shared packages:

4. **Shared Package:** TypeScript types, database repositories, and utilities used by all applications.
5. **Contracts:** Type definitions for all boundaries (API, events, database).

### Orchestration Pattern

The orchestration follows an event-driven pipeline:

```
Goal submitted → Planning job enqueued → Architect agent executes →
Plan stored → Implementation tasks enqueued → Implementation agents execute (parallel) →
Files written → Validation tasks enqueued → Validation executes →
Status updated → Project completed
```

Each transition is a job in a BullMQ queue. Jobs are persistent (Redis-backed), retryable, and observable. The orchestrator process consumes from all queues with configurable concurrency.

### Contract-First Design

All boundaries are defined by TypeScript types before implementation:

- API request/response types
- BullMQ job payload types
- Database schema (migrations)
- Agent output format specifications

This enables parallel development: the API server team and the orchestrator team can work simultaneously as long as they both conform to the shared contracts.

### Key Technical Choices

- **TypeScript everywhere:** One language across the stack eliminates serialization mismatches and enables shared types.
- **PostgreSQL for state:** Reliable, queryable, supports JSONB for semi-structured agent output.
- **Redis/BullMQ for queues:** Battle-tested job queue with priorities, retries, and progress tracking. Redis state is ephemeral; PostgreSQL is the source of truth.
- **Fastify for API:** Fast, TypeScript-first, built-in schema validation.
- **Next.js for UI:** Rapid development, SSR, React ecosystem.
- **pnpm workspaces:** Fast, strict, good monorepo support.

## Consequences

### Positive

- **Parallel development is natural.** Workstreams are isolated by owned directories and connected by contracts. Multiple developers (or AI agents building the system itself) can work simultaneously.
- **Type safety across boundaries.** Shared TypeScript types catch integration errors at compile time, not runtime.
- **Reliable orchestration.** BullMQ provides job persistence, retry, and progress tracking without custom implementation.
- **Clear separation of concerns.** The API server is a thin layer. The orchestrator contains all business logic. The dashboard is a presentation layer. Each can be modified independently.
- **Observable by design.** Every state transition is a database write. The dashboard can show exactly what happened and when.
- **Incrementally deployable.** While MVP is local-only, each application can be independently containerized and deployed when the time comes.
- **Debuggable.** Agent tasks are self-contained. You can inspect the exact prompt, context, and response for any task. Replaying a failed task is as simple as re-enqueuing it.

### Negative

- **Monorepo complexity.** TypeScript project references, workspace configuration, and build ordering require careful setup. This is a one-time cost but it is real.
- **Redis as an additional dependency.** The system requires both PostgreSQL and Redis. Docker Compose handles this locally, but it is one more thing that can fail.
- **BullMQ learning curve.** BullMQ's API for advanced features (stalled job detection, rate limiting, flow producers) has quirks that require reading the documentation carefully.
- **Single-process orchestrator.** The orchestrator is a single Node.js process. If it crashes, all in-flight jobs stall until it restarts (BullMQ will pick them up again, but there is a delay). For MVP, this is acceptable. For production, the orchestrator should run as multiple replicas.
- **No agent-to-agent communication.** Agents cannot ask each other questions or share intermediate results. All coordination goes through the orchestrator and contracts. This simplifies the system but may limit the quality of agent output when a task would benefit from knowing what another agent has produced.

### Risks

- **Contract quality depends on the architect agent.** If the architect agent produces poor contracts, all downstream agents will produce code that does not integrate well. Mitigated by contract validation and eventual human review.
- **Claude API cost and latency.** Each agent task is a Claude API call. A project with 15-20 tasks could cost several dollars and take 10-15 minutes. Acceptable for MVP but needs cost tracking and optimization for production.
- **File system output is fragile.** Writing to the local file system is simple but has no versioning, no rollback, and no conflict resolution beyond "last write wins." Mitigated by the contract system preventing overlapping file ownership.

## References

- [BullMQ Documentation](https://docs.bullmq.io/)
- [Fastify Documentation](https://fastify.dev/docs/latest/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- Architecture diagram: see `docs/architecture.md`
- Stack decisions: see `docs/stack-decisions.md`
