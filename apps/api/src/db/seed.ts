import { db, schema } from "./index.js";

async function seed() {
  console.log("Seeding database...");

  // Create a sample project
  const [project] = await db.insert(schema.projects).values({
    name: "Sample Orchestration Project",
    goal: "Build a REST API with authentication and a React dashboard",
    status: "draft",
  }).returning();

  console.log("Created project:", project.id);
  console.log("Seeding complete.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
