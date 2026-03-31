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
  "ceo",
  "planner",
  "architect",
  "lead",
  "backend",
  "frontend",
  "data",
  "devops",
  "qa",
  "reviewer",
]);

export const agentTierEnum = pgEnum("agent_tier", [
  "ceo",
  "planner",
  "architect",
  "lead",
  "specialist",
  "reviewer",
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

export const auditActionEnum = pgEnum("audit_action", [
  "created",
  "updated",
  "status_changed",
  "delegated",
  "escalated",
  "reviewed",
  "completed",
  "failed",
]);

export const actorTypeEnum = pgEnum("actor_type", ["user", "agent", "system"]);

export const escalationStatusEnum = pgEnum("escalation_status", [
  "open",
  "acknowledged",
  "resolved",
  "dismissed",
]);

export const artifactTypeEnum = pgEnum("artifact_type", [
  "code_diff",
  "test_result",
  "document",
  "architecture",
  "config",
  "log",
  "review_report",
]);

export const workspaces = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const agentDefinitions = pgTable(
  "agent_definitions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    role: agentRoleEnum("role").notNull(),
    tier: agentTierEnum("tier").notNull(),
    parentRole: agentRoleEnum("parent_role"),
    name: text("name").notNull(),
    systemPrompt: text("system_prompt"),
    capabilities: jsonb("capabilities").$type<string[]>().default([]).notNull(),
    maxConcurrentTasks: integer("max_concurrent_tasks").default(1).notNull(),
    provider: providerEnum("provider"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [index("idx_agent_definitions_workspace_role").on(t.workspaceId, t.role)],
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
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
  (t) => [
    index("idx_projects_status").on(t.status),
    index("idx_projects_workspace_id").on(t.workspaceId),
  ],
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
    tier: agentTierEnum("tier"),
    parentTaskId: uuid("parent_task_id"),
    rootTaskId: uuid("root_task_id"),
    depth: integer("depth").default(0).notNull(),
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
    index("idx_agent_tasks_parent").on(t.parentTaskId),
  ],
);

export const features = pgTable(
  "features",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
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
    index("idx_features_workspace_id").on(t.workspaceId),
    index("idx_features_orchestration_project_id").on(t.orchestrationProjectId),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    actorType: actorTypeEnum("actor_type").notNull(),
    actorId: text("actor_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_audit_logs_entity").on(t.entityType, t.entityId),
    index("idx_audit_logs_project").on(t.projectId, t.createdAt),
  ],
);

export const artifacts = pgTable(
  "artifacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id").references(() => agentTasks.id, { onDelete: "cascade" }),
    workstreamId: uuid("workstream_id").references(() => workstreams.id, { onDelete: "cascade" }),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    type: artifactTypeEnum("type").notNull(),
    name: text("name").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    sizeBytes: integer("size_bytes").default(0).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_artifacts_project_type").on(t.projectId, t.type),
    index("idx_artifacts_task").on(t.taskId),
  ],
);

export const escalations = pgTable(
  "escalations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .references(() => agentTasks.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    fromTier: agentTierEnum("from_tier").notNull(),
    toTier: agentTierEnum("to_tier").notNull(),
    reason: text("reason").notNull(),
    context: jsonb("context").$type<Record<string, unknown>>().default({}).notNull(),
    status: escalationStatusEnum("status").default("open").notNull(),
    resolution: text("resolution"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_escalations_project").on(t.projectId),
    index("idx_escalations_status").on(t.status),
  ],
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .references(() => agentTasks.id, { onDelete: "cascade" })
      .notNull(),
    workstreamId: uuid("workstream_id")
      .references(() => workstreams.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    verdict: text("verdict").notNull(),
    feedback: text("feedback").notNull(),
    requestedChanges: jsonb("requested_changes").$type<string[]>().default([]).notNull(),
    iteration: integer("iteration").default(1).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("idx_reviews_task").on(t.taskId),
    index("idx_reviews_workstream").on(t.workstreamId),
  ],
);
