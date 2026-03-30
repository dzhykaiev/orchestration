import type { Job } from "bullmq";
// TODO: Import Anthropic SDK and implement planning logic

interface PlanningJobData {
  projectId: string;
  goal: string;
}

export async function handlePlanningJob(job: Job<PlanningJobData>) {
  const { projectId, goal } = job.data;
  console.log(`Planning project ${projectId}: ${goal}`);

  // TODO: Implementation steps:
  // 1. Call Claude API with architect prompt + goal
  // 2. Parse response into architecture + workstreams
  // 3. Store architecture in project record
  // 4. Create workstream records in database
  // 5. Dispatch implementation tasks for workstreams with no dependencies
  // 6. Update project status to "in_progress"

  return { projectId, workstreams: [] };
}
