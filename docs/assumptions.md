# Assumptions

This document lists the key assumptions underlying the MVP design. Each assumption is a deliberate simplification that reduces scope and complexity. If any assumption proves wrong during development or early usage, it should be revisited and the affected components should be redesigned.

## 1. Single User / Operator

**Assumption:** The system has exactly one user. There is no authentication, no authorization, no multi-tenancy, and no concept of user accounts.

**Implication:** The API server has no auth middleware. The database has no `user_id` columns. The web dashboard has no login page. Any request to the API is trusted.

**When this breaks:** If the system is ever shared between multiple people, or deployed to a server accessible over the network. At that point, add authentication (API keys or OAuth), add `user_id` foreign keys to projects, and add authorization checks to every endpoint.

## 2. Sequential Tasks Within Workstreams, Parallel Workstreams

**Assumption:** Within a single workstream, tasks execute sequentially in dependency order. Across workstreams, execution is parallel (up to the concurrency limit of 3 agents).

**Implication:** The orchestrator does not need to handle intra-workstream parallelism or complex dependency graphs within a workstream. Task dependencies are a simple ordered list, not a DAG.

**When this breaks:** If a workstream has tasks that could safely run in parallel (e.g., generating two independent files). The fix is to support a dependency DAG per workstream instead of a linear sequence. This is a moderate refactor of the task dispatching logic.

## 3. File System as Primary Output Medium

**Assumption:** Agents write code to the local file system. The generated project is a directory of files on disk. There is no git integration, no remote repository pushing, no artifact storage.

**Implication:** The orchestrator needs write access to a configurable output directory. File paths are stored in the database as relative paths within the project output directory. There is no conflict resolution --- if two agents write to the same file (which the contract system should prevent), the last write wins.

**When this breaks:** If users want generated code in a git repository, or if the system runs in a containerized environment without persistent local storage. The fix is to add a storage abstraction layer that can target local filesystem, git, or cloud storage.

## 4. Claude API as the Only LLM Provider

**Assumption:** All agent tasks use the Anthropic Claude API. There is no model selection, no fallback provider, and no abstraction layer for swapping LLM providers.

**Implication:** The agent runtime is tightly coupled to the Claude API client. Prompt templates use Claude-specific formatting conventions. Error handling assumes Claude-specific error codes and rate limits.

**When this breaks:** If Claude's API becomes unavailable, or if a different model performs better for certain task types (e.g., a faster model for validation, a cheaper model for simple file generation). The fix is to introduce a provider interface that the agent runtime calls, with implementations for Claude and other providers. This is a straightforward refactor because agent tasks are already isolated.

## 5. No CI/CD Pipeline Execution

**Assumption:** Agents produce code. They do not execute it, test it, deploy it, or run any CI/CD pipeline. The output is source code on disk, not a running application.

**Implication:** The system does not need a sandbox or container runtime for executing generated code. There is no security boundary between agent output and the host system beyond file system permissions. Validation is limited to static checks (file existence, syntax parsing, schema conformance), not runtime behavior.

**When this breaks:** If users expect the generated code to be tested or running after orchestration completes. The fix is to add a "test execution" phase after implementation, running in a sandboxed Docker container. This is a significant addition but does not require changes to the existing phases.

## 6. Projects Fit in Context Window

**Assumption:** The software projects being generated are small-to-medium in scope --- the kind of project where the full plan, contracts, and relevant existing code fit within Claude's context window (currently 200K tokens). The system does not handle large-scale projects that require context management strategies like summarization, chunking, or retrieval-augmented generation.

**Implication:** The architect agent receives the full goal and produces the full plan in a single API call. Implementation agents receive the full plan plus their workstream's contracts plus any relevant file context in a single prompt. There is no context management, no embedding-based retrieval, and no progressive summarization.

**When this breaks:** If a user submits a goal that requires a plan larger than the context window, or if the accumulated context across a workstream's tasks exceeds the window. The fix is to add context management: summarize completed tasks, retrieve only relevant portions of the plan, and chunk large file generation into smaller tasks.

## 7. Local Development Only

**Assumption:** The system runs on a developer's local machine. Docker Compose provides PostgreSQL and Redis. The Node.js processes run directly on the host. There is no cloud deployment, no managed database, no production infrastructure.

**Implication:** No load balancer, no health check endpoints (beyond basic ones for development), no secrets management (environment variables in `.env`), no horizontal scaling, no log aggregation. The Docker Compose file is the only infrastructure definition.

**When this breaks:** If the system needs to run on a server, serve multiple users, or handle more load than a single machine can provide. The fix is to add Dockerfiles for each application, a production Docker Compose or Kubernetes configuration, managed database and Redis instances, and proper secrets management.

## 8. Deterministic Agent Output is Not Required

**Assumption:** Agent output may vary between runs given the same input. Two executions of the same task with the same prompt may produce different code. The system does not attempt to make agent output deterministic.

**Implication:** Re-running a failed task may produce different (potentially better or worse) output. There is no caching of agent responses. The system relies on validation, not reproducibility, to ensure quality.

**When this breaks:** This assumption is unlikely to break because LLM non-determinism is fundamental. If deterministic output becomes important (e.g., for auditing), the fix is to log full prompts and responses and use a low temperature setting, accepting that exact reproducibility is still not guaranteed.

## 9. Three Implementation Agents is Sufficient

**Assumption:** Three parallel implementation agents provide enough parallelism for MVP-scoped projects without introducing excessive coordination overhead.

**Implication:** The BullMQ implementation queue has a concurrency of 3. The workstream design assumes work can be meaningfully split into roughly 3-5 parallel tracks. The Claude API rate limits are assumed to accommodate 3 concurrent requests.

**When this breaks:** If projects regularly have more than 5 independent workstreams and execution time becomes a bottleneck. The fix is to increase concurrency, which requires checking Claude API rate limits and potentially adding request queuing/throttling at the agent runtime level.

## 10. Contracts Are Correct

**Assumption:** The contracts produced by the architect agent are correct and complete. Implementation agents trust the contracts and do not question or modify them.

**Implication:** If the architect agent produces a contract with a bug (e.g., a missing field, an incorrect type), all implementation agents that depend on that contract will produce code that conforms to the buggy contract. The error will only surface during integration or manual review.

**When this breaks:** This assumption breaks regularly in practice. The fix (beyond MVP) is to add a contract validation phase where a reviewer agent checks contracts for internal consistency, and to support contract amendments mid-execution with automatic re-planning of affected tasks.
