import { NotFoundError } from "../../domain/common/errors.js";
import type { ArtifactsDependencies } from "./ports.js";

export class ArtifactUseCases {
  constructor(private readonly deps: ArtifactsDependencies) {}

  async listByProject(id: string, query: { limit: number; offset: number }) {
    return this.deps.artifactRepo.listByProject(id, query);
  }

  async getById(id: string) {
    const artifact = await this.deps.artifactRepo.getArtifactById(id);
    if (!artifact) {
      throw new NotFoundError("Artifact not found");
    }
    return artifact;
  }

  async delete(id: string) {
    await this.getById(id);
    await this.deps.artifactRepo.deleteArtifact(id);
  }
}
