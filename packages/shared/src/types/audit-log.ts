export type AuditAction =
  | "created"
  | "updated"
  | "status_changed"
  | "delegated"
  | "escalated"
  | "reviewed"
  | "completed"
  | "failed";

export type ActorType = "user" | "agent" | "system";

export interface AuditLog {
  id: string;
  workspaceId: string | null;
  projectId: string | null;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorType: ActorType;
  actorId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateAuditLogInput {
  workspaceId?: string;
  projectId?: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  actorType: ActorType;
  actorId?: string;
  metadata?: Record<string, unknown>;
}
