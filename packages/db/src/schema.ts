import {
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const projectStatusEnum = pgEnum("project_status", [
  "draft",
  "planning",
  "in_progress",
  "completed",
  "failed",
  "cancelled",
  "archived",
]);

export const providerEnum = pgEnum("provider", ["claude", "opencode"]);
export const projectModeEnum = pgEnum("project_mode", ["greenfield", "existing"]);
export const validationStatusEnum = pgEnum("validation_status", ["pass", "fail", "error"]);

export const workstreamStatusEnum = pgEnum("workstream_status", [
  "pending",
  "blocked",
  "in_progress",
  "completed",
  "failed",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
]);

export const agentRoleEnum = pgEnum("agent_role", [
  "architect",
  "backend",
  "frontend",
  "data",
  "devops",
  "qa",
]);

export const featureStatusEnum = pgEnum("feature_status", [
  "backlog",
  "todo",
  "in_progress",
  "done",
  "rejected",
]);

export const featureTypeEnum = pgEnum("feature_type", [
  "feature",
  "bug",
  "improvement",
  "refactor",
]);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    goal: text("goal").notNull(),
    status: projectStatusEnum("status").default("draft").notNull(),
    architecture: text("architecture"),
    provider: providerEnum("provider").default("opencode").notNull(),
    totalCostUsd: numeric("total_cost_usd", { precision: 10, scale: 4 }).default("0").notNull(),
    repoUrl: text("repo_url"),
    repoPath: text("repo_path"),
    projectMode: projectModeEnum("project_mode").default("greenfield").notNull(),
    workBranch: text("work_branch"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_projects_status").on(t.status)],
);

export const workstreams = pgTable(
  "workstreams",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    name: text("name").notNull(),
    objective: text("objective").notNull(),
    status: workstreamStatusEnum("status").default("pending").notNull(),
    dependencies: jsonb("dependencies").$type<string[]>().default([]).notNull(),
    assignedAgent: text("assigned_agent"),
    deliverables: jsonb("deliverables").$type<string[]>().default([]).notNull(),
    ownedPaths: jsonb("owned_paths").$type<string[]>().default([]).notNull(),
    order: integer("order").default(0).notNull(),
    validationStatus: validationStatusEnum("validation_status"),
    validationOutput: text("validation_output"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_workstreams_project_id").on(t.projectId)],
);

export const agentTasks = pgTable(
  "agent_tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workstreamId: uuid("workstream_id")
      .references(() => workstreams.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
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
  },
  (t) => [
    index("idx_agent_tasks_workstream_id").on(t.workstreamId),
    index("idx_agent_tasks_project_id").on(t.projectId),
    index("idx_agent_tasks_status").on(t.status),
  ],
);

export const features = pgTable(
  "features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    status: featureStatusEnum("status").default("backlog").notNull(),
    type: featureTypeEnum("type").default("feature").notNull(),
    priority: integer("priority").default(0).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    orchestrationProjectId: uuid("orchestration_project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_features_status").on(t.status),
    index("idx_features_orchestration_project_id").on(t.orchestrationProjectId),
  ],
);
