import type { ProjectStatus } from "@orchestration/shared";

export interface RecoveryProject {
  id: string;
  status: string;
}

export interface RecoveryTask {
  id: string;
  workstreamId: string;
  projectId: string;
  role: string;
  prompt: string;
}

export interface RecoveryTaskWithAttempts extends RecoveryTask {
  attempts: number;
  maxAttempts: number;
}

export interface RecoveryProjectRepo {
  findStaleProjects(status: string, staleMinutes: number): Promise<RecoveryProject[]>;
  updateProject(projectId: string, patch: Record<string, unknown>): Promise<unknown>;
}

export interface RecoveryTaskRepo {
  findStaleTasks(status: string, staleMinutes: number): Promise<RecoveryTask[]>;
  getTaskById(taskId: string): Promise<RecoveryTaskWithAttempts | null>;
  markTaskFailed(taskId: string, error: string): Promise<unknown>;
  retryTask(taskId: string): Promise<unknown>;
}

export interface RecoveryDependencies {
  projectRepo: RecoveryProjectRepo;
  taskRepo: RecoveryTaskRepo;
  implementationQueue: {
    add(
      name: string,
      data: Record<string, unknown>,
      opts?: { jobId?: string; removeOnComplete?: boolean },
    ): Promise<unknown>;
  };
  eventBus: {
    emitTyped(event: string, payload: Record<string, unknown>): void;
  };
  canProjectTransition(from: string, to: ProjectStatus): boolean;
}

export interface RecoveryConfig {
  stalePlanningMinutes: number;
  staleQueuedMinutes: number;
  staleRunningMinutes: number;
}
