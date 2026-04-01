DO $$ BEGIN
  CREATE TYPE "public"."feature_assignee_mode" AS ENUM('orchestrator', 'agent');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "features"
  ADD COLUMN IF NOT EXISTS "source_project_id" uuid,
  ADD COLUMN IF NOT EXISTS "assignee_mode" "feature_assignee_mode" DEFAULT 'orchestrator' NOT NULL,
  ADD COLUMN IF NOT EXISTS "assignee_agent_definition_id" uuid;

DO $$ BEGIN
  ALTER TABLE "features"
    ADD CONSTRAINT "features_source_project_id_projects_id_fk"
    FOREIGN KEY ("source_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "features"
    ADD CONSTRAINT "features_assignee_agent_definition_id_agent_definitions_id_fk"
    FOREIGN KEY ("assignee_agent_definition_id") REFERENCES "public"."agent_definitions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_features_source_project_id" ON "features" ("source_project_id");
CREATE INDEX IF NOT EXISTS "idx_features_assignee_mode" ON "features" ("assignee_mode");
CREATE INDEX IF NOT EXISTS "idx_features_assignee_agent_definition_id" ON "features" ("assignee_agent_definition_id");

ALTER TABLE "features"
  DROP CONSTRAINT IF EXISTS "features_assignee_mode_consistency";

ALTER TABLE "features"
  ADD CONSTRAINT "features_assignee_mode_consistency"
  CHECK (
    ("assignee_mode" = 'orchestrator' AND "assignee_agent_definition_id" IS NULL) OR
    ("assignee_mode" = 'agent' AND "assignee_agent_definition_id" IS NOT NULL)
  );
