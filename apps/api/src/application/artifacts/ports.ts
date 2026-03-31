export interface ArtifactRecord {
  id: string;
  [key: string]: unknown;
}

export interface ArtifactListQuery {
  limit: number;
  offset: number;
}

export interface ArtifactRepositoryPort {
  listByProject(
    projectId: string,
    opts: ArtifactListQuery,
  ): Promise<{ artifacts?: ArtifactRecord[]; data?: ArtifactRecord[]; total: number }>;
  getArtifactById(id: string): Promise<ArtifactRecord | null>;
  deleteArtifact(id: string): Promise<void>;
}

export interface ArtifactsDependencies {
  artifactRepo: ArtifactRepositoryPort;
}
