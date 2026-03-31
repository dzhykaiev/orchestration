import { artifactRepo } from "@orchestration/db";
import type { ArtifactsDependencies } from "../../application/artifacts/ports.js";

export const defaultArtifactsDependencies: ArtifactsDependencies = {
  artifactRepo,
};
