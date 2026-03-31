-- Step 1: Create a default workspace for orphan projects and features
INSERT INTO "workspaces" ("id", "name", "slug", "description")
SELECT
  gen_random_uuid(),
  'Default Workspace',
  'default',
  'Auto-created workspace for projects and features that had no workspace'
WHERE EXISTS (
  SELECT 1 FROM "projects" WHERE "workspace_id" IS NULL
  UNION
  SELECT 1 FROM "features" WHERE "workspace_id" IS NULL
)
ON CONFLICT ("slug") DO NOTHING;
--> statement-breakpoint

-- Step 2: Assign orphan projects to the default workspace
UPDATE "projects"
SET "workspace_id" = (SELECT "id" FROM "workspaces" WHERE "slug" = 'default')
WHERE "workspace_id" IS NULL;
--> statement-breakpoint

-- Step 3: Assign orphan features to the default workspace
UPDATE "features"
SET "workspace_id" = (SELECT "id" FROM "workspaces" WHERE "slug" = 'default')
WHERE "workspace_id" IS NULL;
--> statement-breakpoint

-- Step 4: Make workspace_id NOT NULL on projects
ALTER TABLE "projects" ALTER COLUMN "workspace_id" SET NOT NULL;
--> statement-breakpoint

-- Step 5: Make workspace_id NOT NULL on features
ALTER TABLE "features" ALTER COLUMN "workspace_id" SET NOT NULL;
