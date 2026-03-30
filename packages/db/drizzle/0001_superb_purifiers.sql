CREATE INDEX "idx_agent_tasks_workstream_id" ON "agent_tasks" USING btree ("workstream_id");--> statement-breakpoint
CREATE INDEX "idx_agent_tasks_project_id" ON "agent_tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_workstreams_project_id" ON "workstreams" USING btree ("project_id");