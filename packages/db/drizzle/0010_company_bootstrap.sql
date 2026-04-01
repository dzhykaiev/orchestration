DO $$ BEGIN
  ALTER TYPE "public"."provider" ADD VALUE IF NOT EXISTS 'codex';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "public"."bootstrap_agent_role" AS ENUM('ceo', 'orchestrator');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "workspaces"
  ADD COLUMN IF NOT EXISTS "mission" text DEFAULT '' NOT NULL,
  ADD COLUMN IF NOT EXISTS "bootstrap_agent_role" "bootstrap_agent_role" DEFAULT 'ceo' NOT NULL,
  ADD COLUMN IF NOT EXISTS "bootstrap_agent_provider" "provider" DEFAULT 'opencode' NOT NULL;

UPDATE "workspaces"
SET "mission" = COALESCE(NULLIF(trim("description"), ''), "name")
WHERE "mission" = '';
