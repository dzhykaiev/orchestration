export interface EscalationRecord {
  id: string;
  [key: string]: unknown;
}

export interface EscalationListQuery {
  limit: number;
  offset: number;
}

export interface EscalationRepositoryPort {
  listByProject(
    projectId: string,
    opts: EscalationListQuery,
  ): Promise<{ escalations?: EscalationRecord[]; data?: EscalationRecord[]; total: number }>;
  resolveEscalation(id: string, resolution: string): Promise<EscalationRecord | null>;
  dismissEscalation(id: string): Promise<EscalationRecord | null>;
}

export interface EscalationsDependencies {
  escalationRepo: EscalationRepositoryPort;
}
