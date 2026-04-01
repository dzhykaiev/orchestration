import type { LLMProviderType } from "./types/index.js";

const DEFAULT_PROVIDER: LLMProviderType = "opencode";
const ALLOWED_PROVIDERS = new Set<LLMProviderType>(["claude", "codex", "opencode"]);

export function resolveProvider(projectProvider?: string | null): LLMProviderType {
  if (!projectProvider) return DEFAULT_PROVIDER;
  const normalized = projectProvider.toLowerCase();
  return ALLOWED_PROVIDERS.has(normalized as LLMProviderType)
    ? (normalized as LLMProviderType)
    : DEFAULT_PROVIDER;
}
