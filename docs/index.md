---
layout: home

hero:
  name: "Orchestration"
  text: "AI-Driven Software Platform"
  tagline: "Submit a goal — get working code. AI agents plan, implement, and validate in parallel."
  actions:
    - theme: brand
      text: Getting Started
      link: /guide/getting-started
    - theme: alt
      text: Architecture
      link: /architecture

features:
  - icon: "🎯"
    title: Goal-Driven
    details: Describe what you want in plain language. The architect agent designs the system, breaks it into workstreams, and creates contracts.
  - icon: "🤖"
    title: Multi-Agent Orchestration
    details: Multiple AI agents work in parallel — architect plans, backend/frontend/data/devops implement, QA validates. All coordinated via BullMQ.
  - icon: "📊"
    title: Real-Time Dashboard
    details: Track every step in the Next.js dashboard. See workstream progress, agent output, generated files, and dependency graphs in real-time via SSE.
  - icon: "📝"
    title: Contract-First
    details: Every boundary is defined by explicit TypeScript contracts before implementation. Agents coordinate through contracts, not direct communication.
  - icon: "🔄"
    title: Retry & Self-Correct
    details: Failed tasks are retried with error context from previous attempts, giving agents a chance to self-correct.
  - icon: "🏗️"
    title: TypeScript Monorepo
    details: Full-stack TypeScript with pnpm workspaces. Fastify API, Next.js dashboard, BullMQ orchestrator, PostgreSQL + Redis.
---
