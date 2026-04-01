DO $$ BEGIN
  CREATE TYPE "public"."todo_status" AS ENUM('pending', 'in_progress', 'completed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "todos" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workspace_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" "todo_status" DEFAULT 'pending' NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "todos"
    ADD CONSTRAINT "todos_workspace_id_workspaces_id_fk"
    FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "idx_todos_workspace" ON "todos" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_todos_status" ON "todos" ("status");
