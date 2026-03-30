// Re-export schema from the API package to keep a single source of truth.
// Both apps/api and apps/orchestrator use the same schema definition.
export {
  projects,
  workstreams,
  agentTasks,
  projectStatusEnum,
  workstreamStatusEnum,
  taskStatusEnum,
  agentRoleEnum,
} from "../../../api/src/db/schema.js";
