import type { AgentRole, ReviewVerdict } from "@orchestration/shared";

export interface ProgressWorkstream {
  id: string;
  name: string;
  objective: string;
  dependencies: string[];
  deliverables: string[];
  ownedPaths: string[];
  assignedAgent: string | null;
  status: string;
}

export interface ProgressTask {
  id: string;
  role: string;
  prompt: string;
  status: string;
  output?: string | null;
  filesModified?: string[] | null;
}

export interface ProgressProject {
  id: string;
  name: string;
  status: string;
  provider?: string | null;
  projectMode?: string | null;
  workBranch?: string | null;
  repoPath?: string | null;
}

export interface ProgressFeature {
  id: string;
  status: string;
}

export interface ProgressDependencies {
  workstreamRepo: {
    getWorkstreamById(workstreamId: string): Promise<ProgressWorkstream | null>;
    listWorkstreamsByProject(projectId: string): Promise<ProgressWorkstream[]>;
    updateWorkstream(workstreamId: string, patch: Record<string, unknown>): Promise<unknown>;
  };
  taskRepo: {
    countTasksByWorkstream(workstreamId: string): Promise<{
      total: number;
      completed: number;
      failed: number;
    }>;
    createTask(input: {
      workstreamId: string;
      projectId: string;
      role: AgentRole;
      prompt: string;
    }): Promise<{ id: string; role: string; prompt: string } | null>;
    listTasksByWorkstream(workstreamId: string): Promise<ProgressTask[]>;
  };
  projectRepo: {
    getProjectById(projectId: string): Promise<ProgressProject | null>;
    updateProject(projectId: string, patch: Record<string, unknown>): Promise<unknown>;
  };
  featureRepo: {
    getFeatureByProjectId(projectId: string): Promise<ProgressFeature | null>;
    updateFeature(featureId: string, patch: Record<string, unknown>): Promise<unknown>;
  };
  auditLogRepo: {
    createAuditLog(input: {
      projectId?: string;
      entityType: string;
      entityId: string;
      action: string;
      actorType: string;
      actorId?: string | null;
      metadata?: Record<string, unknown>;
      workspaceId?: string | null;
    }): Promise<unknown>;
  };
  reviewRepo: {
    createReview(input: {
      taskId: string;
      workstreamId: string;
      projectId: string;
      verdict: ReviewVerdict;
      feedback: string;
    }): Promise<unknown>;
  };
  eventBus: {
    emitTyped(event: string, payload: Record<string, unknown>): void;
  };
  implementationQueue: {
    add(name: string, data: Record<string, unknown>, opts?: { jobId?: string }): Promise<unknown>;
  };
  validationQueue: {
    add(name: string, data: Record<string, unknown>, opts?: { jobId?: string }): Promise<unknown>;
  };
  withLock<T>(key: string, fn: () => Promise<T>): Promise<T | null>;
  buildUserMessage(basePrompt: string, workstream: ProgressWorkstream): string;
  resolveProvider(provider: string | null | undefined): string;
  canTransition(transitions: Record<string, readonly string[]>, from: string, to: string): boolean;
  transitions: {
    workstream: Record<string, readonly string[]>;
    project: Record<string, readonly string[]>;
    feature: Record<string, readonly string[]>;
  };
  reviewVerdictPattern: RegExp;
  validationEnabled: boolean;
  projectsDir: string;
  runGit(projectDir: string, args: string[]): Promise<void>;
  defaultImplementationRole: AgentRole;
}

export interface ProgressService {
  checkWorkstreamCompletion(workstreamId: string, projectId: string): Promise<void>;
  unblockDependents(completedWorkstreamId: string, projectId: string): Promise<void>;
  checkProjectCompletion(projectId: string): Promise<void>;
  handleReviewerOutput(
    taskId: string,
    workstreamId: string,
    projectId: string,
    output: string,
  ): Promise<void>;
}

export type ReviewerVerdict = ReviewVerdict;
