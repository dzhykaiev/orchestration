CREATE TYPE "public"."feature_status" AS ENUM('backlog', 'todo', 'in_progress', 'done', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."feature_type" AS ENUM('feature', 'bug', 'improvement', 'refactor');--> statement-breakpoint
CREATE TABLE "features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" "feature_status" DEFAULT 'backlog' NOT NULL,
	"type" "feature_type" DEFAULT 'feature' NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"orchestration_project_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "repo_url" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "repo_path" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "project_mode" text DEFAULT 'greenfield' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "work_branch" text;--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT "features_orchestration_project_id_projects_id_fk" FOREIGN KEY ("orchestration_project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_features_status" ON "features" USING btree ("status");