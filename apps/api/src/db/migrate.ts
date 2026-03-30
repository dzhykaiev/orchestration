import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "@orchestration/db";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function runMigrations() {
  console.log("Running migrations...");
  // Migrations are in packages/db/drizzle
  const migrationsFolder = resolve(__dirname, "../../../../packages/db/drizzle");
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
