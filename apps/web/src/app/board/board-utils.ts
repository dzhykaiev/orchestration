import type { Feature } from "../../lib/api";

export function buildFeatureSearchText(
  feature: Feature,
  agentName: string,
  sourceProjectName?: string,
  linkedProjectName?: string,
): string {
  return [
    feature.title,
    feature.description,
    feature.type,
    feature.status,
    feature.assigneeMode,
    agentName,
    sourceProjectName,
    linkedProjectName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}
