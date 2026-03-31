import { ArtifactUseCases } from "../application/artifacts/artifact-use-cases.js";
import type { ArtifactsDependencies } from "../application/artifacts/ports.js";
import { NotFoundError } from "../domain/common/errors.js";
import { defaultArtifactsDependencies } from "../infrastructure/artifacts/artifact-dependencies.js";

export class ArtifactService extends ArtifactUseCases {
  constructor(deps: ArtifactsDependencies = defaultArtifactsDependencies) {
    super(deps);
  }
}

export { NotFoundError };

export const artifactService = new ArtifactService();
