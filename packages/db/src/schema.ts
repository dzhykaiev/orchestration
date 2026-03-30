import { pgTable, uuid, text, timestamp, integer, numeric, jsonb, pgEnum, index } from "drizzle-orm/pg-core";

export const projectStatusEnum = pgEnum("project_status", [
  "draft", "planning", "in_progress", "completed", "failed", "archived",
]);

export const workstreamStatusEnum = pgEnum("workstream_status", [
  "pending", "blocked", "in_progress", "completed", "failed",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "queued", "running", "completed", "failed", "cancelled",
]);

export const agentRoleEnum = pgEnum("agent_role", [
  "architect", "backend", "frontend", "data", "devops", "qa",
]);

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  status: projectStatusEnum("status").default("draft").notNull(),
  architecture: text("architecture"),
  provider: text("provider").default("opencode").notNull(),
  totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 4 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const workstreams = pgTable("workstreams", {
  id: uuid("id").defaultRandom().primaryKey(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  objective: text("objective").notNull(),
  status: workstreamStatusEnum("status").default("pending").notNull(),
  dependencies: jsonb("dependencies").$type<string[]>().default([]).notNull(),
  assignedAgent: text("assigned_agent"),
  deliverables: jsonb("deliverables").$type<string[]>().default([]).notNull(),
  ownedPaths: jsonb("owned_paths").$type<string[]>().default([]).notNull(),
  order: integer("order").default(0).notNull(),
  validationStatus: text("validation_status"),
  validationOutput: text("validation_output"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_workstreams_project_id").on(t.projectId),
]);

export const agentTasks = pgTable("agent_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  workstreamId: uuid("workstream_id").references(() => workstreams.id).notNull(),
  projectId: uuid("project_id").references(() => projects.id).notNull(),
  role: agentRoleEnum("role").notNull(),
  prompt: text("prompt").notNull(),
  status: taskStatusEnum("status").default("queued").notNull(),
  output: text("output"),
  filesModified: jsonb("files_modified").$type<string[]>().default([]).notNull(),
  error: text("error"),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).default("0").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  maxAttempts: integer("max_attempts").default(3).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("idx_agent_tasks_workstream_id").on(t.workstreamId),
  index("idx_agent_tasks_project_id").on(t.projectId),
]);
