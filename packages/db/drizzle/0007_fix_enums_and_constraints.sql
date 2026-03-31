-- Fix enum types that were created as text in previous migrations
-- Add missing FK constraint on parent_task_id
-- Add missing indexes for performance

-- 1. Create provider enum type if not exists (referenced by agent_definitions)
DO $$ BEGIN
  CREATE TYPE "provider" AS ENUM ('claude', 'opencode');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create project_mode enum type
DO $$ BEGIN
  CREATE TYPE "project_mode" AS ENUM ('greenfield', 'existing');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Create validation_status enum type
DO $$ BEGIN
  CREATE TYPE "validation_status" AS ENUM ('pass', 'fail', 'error');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 4. Create review_verdict enum type
DO $$ BEGIN
  CREATE TYPE "review_verdict" AS ENUM ('approved', 'changes_requested', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 5. Convert text columns to proper enum types
-- Note: ALTER COLUMN ... TYPE only works if existing values match enum values
ALTER TABLE "agent_definitions" ALTER COLUMN "provider" TYPE "provider" USING "provider"::"provider";
ALTER TABLE "projects" ALTER COLUMN "project_mode" TYPE "project_mode" USING "project_mode"::"project_mode";
ALTER TABLE "workstreams" ALTER COLUMN "validation_status" TYPE "validation_status" USING "validation_status"::"validation_status";
ALTER TABLE "reviews" ALTER COLUMN "verdict" TYPE "review_verdict" USING "verdict"::"review_verdict";

-- 6. Add missing FK constraint on parent_task_id
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_parent_task_id_fk"
  FOREIGN KEY ("parent_task_id") REFERENCES "agent_tasks"("id") ON DELETE CASCADE;

-- 7. Add missing FK constraint on root_task_id
ALTER TABLE "agent_tasks" ADD CONSTRAINT "agent_tasks_root_task_id_fk"
  FOREIGN KEY ("root_task_id") REFERENCES "agent_tasks"("id") ON DELETE SET NULL;

-- 8. Add missing indexes for performance
CREATE INDEX IF NOT EXISTS "idx_agent_tasks_root_task_id" ON "agent_tasks" ("root_task_id");
CREATE INDEX IF NOT EXISTS "idx_agent_tasks_workstream_status" ON "agent_tasks" ("workstream_id", "status");
CREATE INDEX IF NOT EXISTS "idx_projects_workspace_status" ON "projects" ("workspace_id", "status");
CREATE INDEX IF NOT EXISTS "idx_reviews_project_id" ON "reviews" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_escalations_task_id" ON "escalations" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_artifacts_workstream_id" ON "artifacts" ("workstream_id");
