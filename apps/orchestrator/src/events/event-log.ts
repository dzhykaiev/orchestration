import type { OrchestratorEvent } from "@orchestration/shared";
import { createEventLogService } from "../application/event-log/event-log-use-cases.js";
import { defaultEventLogDependencies } from "../infrastructure/event-log/event-log-dependencies.js";

const eventLogService = createEventLogService(defaultEventLogDependencies);

export async function persistEvent(event: OrchestratorEvent): Promise<void> {
  return eventLogService.persistEvent(event);
}

export async function listEventsByProject(projectId: string, limit = 100) {
  return eventLogService.listEventsByProject(projectId, limit);
}

export async function purgeOldEvents(olderThanDays = 7): Promise<number> {
  return eventLogService.purgeOldEvents(olderThanDays);
}
