import type { LLMProviderType } from "@orchestration/shared";

export interface PlanJobPayload {
  projectId: string;
  goal: string;
  provider: LLMProviderType;
}

export function buildPlanJobPayload(input: {
  projectId: string;
  goal: string;
  projectProvider?: string | null;
  resolveProvider: (projectProvider?: string | null) => LLMProviderType;
}): PlanJobPayload {
  return {
    projectId: input.projectId,
    goal: input.goal,
    provider: input.resolveProvider(input.projectProvider),
  };
}
