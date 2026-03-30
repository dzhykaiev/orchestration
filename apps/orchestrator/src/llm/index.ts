import type { LLMProvider } from "@orchestration/shared";
import { ClaudeProvider } from "./claude-provider.js";
import { OpenCodeProvider } from "./opencode-provider.js";

/**
 * Factory to create LLM provider.
 *
 * Priority:
 * 1. Explicit provider parameter
 * 2. ROLE_PROVIDER_MAP env (per-role)
 * 3. LLM_PROVIDER env (global, default: "opencode")
 */
export function createLLMProvider(role?: string, provider?: string): LLMProvider {
  // 1. Explicit provider from job data
  if (provider) {
    return provider === "claude" ? new ClaudeProvider() : new OpenCodeProvider();
  }

  // 2. Per-role mapping
  const roleMapStr = process.env.ROLE_PROVIDER_MAP;
  if (roleMapStr && role) {
    try {
      const roleMap = JSON.parse(roleMapStr) as Record<string, string>;
      const providerForRole = roleMap[role]?.toLowerCase();
      if (providerForRole) {
        return providerForRole === "opencode" ? new OpenCodeProvider() : new ClaudeProvider();
      }
    } catch {
      // ignore invalid JSON
    }
  }

  // 3. Global provider
  const p = process.env.LLM_PROVIDER?.toLowerCase() || "opencode";
  return p === "claude" ? new ClaudeProvider() : new OpenCodeProvider();
}
