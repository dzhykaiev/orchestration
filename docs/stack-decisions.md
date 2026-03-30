# Stack Decisions

This document explains why each technology was chosen for the platform. Every choice was evaluated against the same criteria: does it reduce complexity, does it support parallel development, and does it work well in an AI-assisted workflow where agents need to understand and generate code.

## TypeScript

**Role:** Primary language for all applications and packages.

**Why:**
- **Single language across the entire stack.** API server, web dashboard, orchestrator, shared packages, and contracts are all TypeScript. There is no context-switching cost, no serialization mismatch between services, and no need for code generation to bridge language boundaries.
- **Type safety across boundaries.** Shared types in `packages/shared` are imported directly by the API server, orchestrator, and web dashboard. When a type changes, the compiler catches every callsite that needs updating. This is especially important in a contract-first architecture where the contracts are literally TypeScript types.
- **Agent-readable and agent-writable.** Claude produces high-quality TypeScript. The language's type annotations serve as inline documentation that helps agents understand existing code and produce compatible new code. When an agent needs to implement a function that conforms to a contract, the TypeScript interface *is* the specification.
- **Ecosystem depth.** npm has packages for everything the platform needs: database clients, queue libraries, HTTP frameworks, file system utilities, testing tools. No gaps to fill.

**Tradeoffs:**
- Runtime performance is adequate but not exceptional. If the orchestrator ever becomes CPU-bound (unlikely --- it is I/O-bound on Claude API calls), this could matter.
- Build tooling complexity. TypeScript monorepos require careful configuration of `tsconfig` paths, project references, and build order. This is a one-time setup cost.

## Fastify

**Role:** HTTP framework for the API server (`apps/api`).

**Why:**
- **Performance.** Fastify is the fastest mainstream Node.js HTTP framework. While raw throughput is not the primary concern for an orchestration API, low overhead means less resource contention when the system is also running agent workers.
- **Schema validation as a first-class feature.** Fastify routes accept JSON Schema for request and response validation. This aligns with the contract-first design: the TypeScript types are the source of truth, and the JSON schemas derived from them are enforced at the HTTP boundary.
- **TypeScript-first.** Fastify's type system is well-designed. Route handlers are fully typed, including request params, query, body, and response. This eliminates a class of bugs that plague Express applications.
- **Plugin architecture.** Fastify's encapsulated plugin system makes it natural to organize routes by domain (projects, workstreams, tasks) without global middleware conflicts.
- **Logging built in.** Fastify uses pino for structured JSON logging out of the box, which is critical for debugging agent orchestration flows.

**Alternatives considered:**
- Express: ubiquitous but TypeScript support is bolted on, no built-in validation, slower.
- Hono: promising but less mature ecosystem, fewer production references at the time of evaluation.
- tRPC: good type safety but adds complexity for a REST API that also needs to serve non-TypeScript clients in the future.

## Next.js

**Role:** Web framework for the dashboard (`apps/web`).

**Why:**
- **Rapid UI development.** Next.js provides file-based routing, server-side rendering, and a good development experience out of the box. For an internal dashboard that is not the core product, development speed matters more than architectural purity.
- **SSR for the dashboard.** The project detail page should load fast with full content on first paint. SSR handles this without requiring a loading skeleton for every page.
- **React ecosystem.** Component libraries, charting tools, and real-time update patterns are well-established in React. The dashboard needs progress bars, task lists, and file trees --- all well-served by existing React components.
- **API routes as a fallback.** If the dashboard ever needs a backend-for-frontend layer (e.g., aggregating multiple API calls into one), Next.js API routes provide this without a separate service.

**Tradeoffs:**
- Next.js is heavy for a simple dashboard. A lighter framework (Vite + React Router) would have a smaller footprint. The tradeoff is acceptable because Next.js reduces decision-making overhead and the dashboard is not performance-critical.
- Version churn. Next.js moves fast and occasionally introduces breaking changes. Pinning versions and being conservative with new features mitigates this.

## PostgreSQL

**Role:** Primary data store for projects, workstreams, tasks, contracts, and logs.

**Why:**
- **Structured data with flexibility.** The core entities (projects, workstreams, tasks) have well-defined schemas. PostgreSQL handles these cleanly with typed columns, foreign keys, and indexes. But agent output is semi-structured --- a JSON blob of files, metadata, and errors. PostgreSQL's JSONB columns handle this without requiring a separate document store.
- **Reliability.** PostgreSQL does not lose data. In a system where agent work can take minutes and costs real money (Claude API calls), losing a task result because of a database quirk is unacceptable.
- **Query power.** Tracking progress across workstreams and tasks requires aggregation queries, status filtering, and ordering. SQL handles this naturally. A document database would require application-level aggregation.
- **Mature tooling.** Migration tools (node-pg-migrate, Drizzle Kit), ORMs (Drizzle, Kysely), and monitoring tools are well-established.

**Tradeoffs:**
- Requires a running server process, unlike SQLite. Docker Compose makes this a non-issue for local development.
- Schema migrations add friction during rapid iteration. Mitigated by keeping the schema simple in MVP and using a lightweight migration tool.

## BullMQ / Redis

**Role:** Job queue for orchestrating agent tasks. Redis is the backing store for BullMQ.

**Why:**
- **Battle-tested job queue.** BullMQ handles the hard parts of distributed job processing: reliable delivery, retries with backoff, priority queues, concurrency limits, and progress tracking. Building this on top of raw Redis pub/sub or PostgreSQL LISTEN/NOTIFY would be reinventing the wheel.
- **Priority support.** Planning tasks must complete before implementation tasks. Implementation tasks within a workstream may have dependency ordering. BullMQ's priority system handles this cleanly.
- **Retry with context.** BullMQ tracks attempt counts and allows custom retry strategies. The orchestrator uses this to add error context from failed attempts to the retry prompt, giving agents a chance to self-correct.
- **Progress tracking.** BullMQ supports job progress updates (0-100%), which the dashboard can poll to show real-time task progress.
- **Redis as a fast ephemeral store.** Queue state is transient. If Redis restarts, incomplete jobs can be re-enqueued from PostgreSQL (which has the authoritative task state). Redis does not need persistence guarantees.

**Tradeoffs:**
- Redis is an additional infrastructure dependency. Acceptable because Docker Compose makes it trivial to run locally, and the system already needs a job queue.
- BullMQ's API has some sharp edges (stalled job detection, connection management). These are well-documented and solvable.

## Claude API (Anthropic)

**Role:** LLM provider for all agent tasks (architecture planning, code generation, validation).

**Why:**
- **Best reasoning for code generation.** At the time of this decision, Claude produces the highest-quality output for the specific tasks this system requires: understanding a software goal, designing an architecture, and generating implementation code that conforms to a specification.
- **Large context window.** The architect agent needs to process the full goal, constraints, and output a comprehensive plan. Implementation agents need the plan, contracts, and existing code context. Claude's context window accommodates this without truncation.
- **Structured output.** Claude follows instructions to produce structured output (JSON, code blocks with file paths) reliably, which is critical for automated parsing of agent responses.
- **Streaming support.** Claude's streaming API allows the orchestrator to track agent progress and detect early failures without waiting for the full response.

**Tradeoffs:**
- Single-provider dependency. If Claude's API is down, the system cannot function. Acceptable for MVP. A provider abstraction layer is a planned future addition.
- Cost. Claude API calls for large prompts with long outputs are not cheap. Acceptable for MVP where the operator is a single developer who controls usage.

## pnpm

**Role:** Package manager and workspace manager for the monorepo.

**Why:**
- **Fast.** pnpm's content-addressable store means packages are downloaded once and hard-linked into projects. In a monorepo with shared dependencies, this saves significant disk space and install time.
- **Strict by default.** pnpm does not hoist packages to the root `node_modules` by default. This means each package can only import dependencies it explicitly declares. This prevents phantom dependencies, which is especially important in a monorepo where workspace packages have distinct dependency sets.
- **Good workspace support.** `pnpm-workspace.yaml` is simple. Workspace protocol (`workspace:*`) ensures local packages are linked correctly. Filtering commands (`pnpm --filter apps/api`) make it easy to run scripts in specific packages.

**Alternatives considered:**
- npm: slower, less strict hoisting, weaker workspace support.
- yarn: capable but more complex configuration, berry (PnP) adds friction with tools that expect `node_modules`.
- turborepo: good for build orchestration on top of pnpm, but adds complexity that is not needed for MVP. Can be added later.

## Biome

**Role:** Linter and formatter for all TypeScript code.

**Why:**
- **Single tool.** Biome replaces both ESLint and Prettier. One configuration file, one command, one set of rules. In a monorepo with multiple packages, reducing tool count reduces configuration complexity.
- **Fast.** Biome is written in Rust and is significantly faster than ESLint + Prettier. For a codebase where AI agents generate large amounts of code that needs formatting, speed matters.
- **Sensible defaults.** Biome's default rules are good enough to use without extensive customization. This matters for MVP velocity.

**Tradeoffs:**
- Smaller plugin ecosystem than ESLint. The platform does not need specialized lint rules for MVP.
- Less mature than ESLint. Acceptable because the formatting and linting needs are standard.

## Vitest

**Role:** Test framework for all packages.

**Why:**
- **Fast.** Vitest uses Vite's transform pipeline, making test startup and execution significantly faster than Jest, especially for TypeScript code.
- **TypeScript-native.** No separate `ts-jest` configuration. Vitest understands TypeScript out of the box.
- **API-compatible with Jest.** `describe`, `it`, `expect`, `beforeEach` --- the same testing API developers know. No learning curve.
- **Good DX.** Watch mode, inline snapshot updates, and a UI mode for debugging. The development experience is noticeably better than Jest.
- **Workspace support.** Vitest has first-class monorepo support with workspace configuration, which aligns with the pnpm workspace structure.

## Docker Compose

**Role:** Local development infrastructure (PostgreSQL, Redis).

**Why:**
- **Simple local dev.** `docker-compose up` starts PostgreSQL and Redis with the correct versions, ports, and configuration. No manual installation, no version conflicts.
- **Matches production topology.** Even though MVP is local-only, the Docker Compose setup mirrors how the system would run in production. PostgreSQL is a separate service. Redis is a separate service. The application connects to them over the network. This prevents "works on my machine" issues when the system eventually deploys.
- **Reproducible.** Every developer (or the single MVP operator) gets the same infrastructure. Database version, Redis version, port mappings, and volume mounts are all defined in code.

**Tradeoffs:**
- Docker adds startup time and resource overhead. Acceptable for development where these services run continuously.
- Debugging network issues between containers and host can be frustrating. Mitigated by using well-documented port mappings and health checks.
