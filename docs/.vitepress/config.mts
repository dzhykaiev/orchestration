import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Orchestration Platform",
  description: "AI-driven software orchestration platform documentation",
  base: "/",
  cleanUrls: true,
  ignoreDeadLinks: [/localhost/],

  head: [["link", { rel: "icon", href: "/favicon.ico" }]],

  themeConfig: {
    logo: "/logo.svg",
    siteTitle: "Orchestration",

    nav: [
      { text: "Guide", link: "/guide/getting-started" },
      { text: "Architecture", link: "/architecture" },
      { text: "API", link: "/api/overview" },
      { text: "Agents", link: "/agents/overview" },
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Introduction",
          items: [
            { text: "What is this?", link: "/guide/what-is-this" },
            { text: "Getting Started", link: "/guide/getting-started" },
            { text: "Project Structure", link: "/guide/project-structure" },
          ],
        },
        {
          text: "Development",
          items: [
            { text: "Local Setup", link: "/guide/local-setup" },
            { text: "Commands", link: "/guide/commands" },
            { text: "Environment Variables", link: "/guide/env-variables" },
            { text: "Troubleshooting", link: "/guide/troubleshooting" },
          ],
        },
      ],
      "/": [
        {
          text: "Architecture",
          items: [
            { text: "System Overview", link: "/architecture" },
            { text: "Zero-Human Company Flow", link: "/product-flow-zero-human-company" },
            { text: "Database Schema", link: "/database" },
            { text: "Queue System", link: "/queues" },
            { text: "Event System", link: "/events" },
            { text: "Stack Decisions", link: "/stack-decisions" },
            { text: "Assumptions", link: "/assumptions" },
          ],
        },
        {
          text: "API Reference",
          items: [
            { text: "Overview", link: "/api/overview" },
            { text: "Tickets", link: "/api/tickets" },
            { text: "Projects", link: "/api/projects" },
            { text: "Workstreams", link: "/api/workstreams" },
            { text: "Tasks", link: "/api/tasks" },
            { text: "Workspaces", link: "/api/workspaces" },
            { text: "Features", link: "/api/features" },
            { text: "Artifacts", link: "/api/artifacts" },
            { text: "Audit Logs", link: "/api/audit-logs" },
            { text: "SSE Events", link: "/api/events" },
          ],
        },
        {
          text: "Agents",
          items: [
            { text: "Overview", link: "/agents/overview" },
            { text: "Architect", link: "/agents/architect" },
            { text: "Backend", link: "/agents/backend" },
            { text: "Frontend", link: "/agents/frontend" },
            { text: "Data", link: "/agents/data" },
            { text: "DevOps", link: "/agents/devops" },
            { text: "QA", link: "/agents/qa" },
          ],
        },
        {
          text: "Design",
          items: [
            { text: "Contracts", link: "/design/contracts" },
            { text: "ADR-001: Architecture", link: "/design/adr-001" },
            { text: "Implementation Plan", link: "/design/implementation-plan" },
            { text: "Workstreams", link: "/design/workstreams" },
          ],
        },
        {
          text: "Runbooks",
          items: [{ text: "Agent Company Operations", link: "/runbooks/agent-company-operations" }],
        },
      ],
    },

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/dzhykaiev/orchestration",
      },
    ],

    search: {
      provider: "local",
    },

    outline: {
      level: [2, 3],
    },

    footer: {
      message: "AI-driven Software Orchestration Platform",
    },

    editLink: {
      pattern: "https://github.com/dzhykaiev/orchestration/edit/main/docs/:path",
      text: "Edit this page on GitHub",
    },
  },
});
