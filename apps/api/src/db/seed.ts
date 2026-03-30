import { db, schema } from "./index.js";

async function seed() {
  console.log("Seeding database...");

  // Project 1: draft state
  const [draftProject] = await db
    .insert(schema.projects)
    .values({
      name: "Todo App",
      goal: "Build a full-stack todo application with React frontend and REST API",
      status: "draft",
    })
    .returning();
  console.log("Created draft project:", draftProject.id);

  // Project 2: in_progress state with workstreams and tasks
  const [activeProject] = await db
    .insert(schema.projects)
    .values({
      name: "E-Commerce API",
      goal: "Build a REST API for an e-commerce platform with products, orders, and user accounts",
      status: "in_progress",
      architecture: "## Architecture\n\nMonolith REST API with PostgreSQL.\n\n### Endpoints\n- /api/products\n- /api/orders\n- /api/users",
    })
    .returning();
  console.log("Created active project:", activeProject.id);

  // Workstreams for active project
  const [wsData] = await db
    .insert(schema.workstreams)
    .values({
      projectId: activeProject.id,
      name: "Data Layer",
      objective: "Set up database schema for products, orders, and users",
      status: "completed",
      dependencies: [],
      deliverables: ["schema.ts", "migrations/", "repositories/"],
      ownedPaths: ["src/db/"],
      order: 1,
    })
    .returning();

  const [wsApi] = await db
    .insert(schema.workstreams)
    .values({
      projectId: activeProject.id,
      name: "API Server",
      objective: "Implement REST endpoints for products, orders, and users",
      status: "in_progress",
      dependencies: [wsData.id],
      deliverables: ["routes/products.ts", "routes/orders.ts", "routes/users.ts"],
      ownedPaths: ["src/routes/", "src/services/"],
      assignedAgent: "backend",
      order: 2,
    })
    .returning();

  const [wsFrontend] = await db
    .insert(schema.workstreams)
    .values({
      projectId: activeProject.id,
      name: "Admin Dashboard",
      objective: "Build admin UI for managing products and viewing orders",
      status: "pending",
      dependencies: [wsApi.id],
      deliverables: ["pages/", "components/"],
      ownedPaths: ["src/app/"],
      order: 3,
    })
    .returning();

  // Tasks for completed workstream
  await db.insert(schema.agentTasks).values({
    workstreamId: wsData.id,
    projectId: activeProject.id,
    role: "data",
    prompt: "Create the database schema for products, orders, and users tables",
    status: "completed",
    output: "Created schema with 3 tables and migrations.",
    filesModified: ["src/db/schema.ts", "drizzle/0001_initial.sql"],
    attempts: 1,
    completedAt: new Date(),
  });

  // Tasks for in-progress workstream
  await db.insert(schema.agentTasks).values({
    workstreamId: wsApi.id,
    projectId: activeProject.id,
    role: "backend",
    prompt: "Implement CRUD endpoints for the products resource",
    status: "completed",
    output: "Implemented GET/POST/PATCH/DELETE for products.",
    filesModified: ["src/routes/products.ts"],
    attempts: 1,
    completedAt: new Date(),
  });

  await db.insert(schema.agentTasks).values({
    workstreamId: wsApi.id,
    projectId: activeProject.id,
    role: "backend",
    prompt: "Implement CRUD endpoints for the orders resource",
    status: "running",
    attempts: 1,
    startedAt: new Date(),
  });

  console.log("Created workstreams and tasks for active project");
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
