ALTER TABLE "agent_tasks" ADD COLUMN "cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "total_cost_usd" numeric(10, 4) DEFAULT '0' NOT NULL;