import type { LLMProvider, RunOptions, RunResult } from "@orchestration/shared";
import { CircuitBreaker } from "./circuit-breaker.js";
import { ClaudeProvider } from "./claude-provider.js";
import { OpenCodeProvider } from "./opencode-provider.js";

const breakers = new Map<string, CircuitBreaker>();

function getBreaker(name: string): CircuitBreaker {
  let breaker = breakers.get(name);
  if (!breaker) {
    breaker = new CircuitBreaker({ name });
    breakers.set(name, breaker);
  }
  return breaker;
}

class CircuitBreakerProvider implements LLMProvider {
  constructor(
    private readonly delegate: LLMProvider,
    private readonly breaker: CircuitBreaker,
  ) {}

  run(options: RunOptions): Promise<RunResult> {
    return this.breaker.execute(() => this.delegate.run(options));
  }

  async listFiles(dir: string): Promise<string[]> {
    return this.delegate.listFiles(dir);
  }

  get state() {
    return this.breaker.currentState;
  }

  reset(): void {
    this.breaker.reset();
  }
}

export function createLLMProvider(role?: string, provider?: string): LLMProvider {
  let delegate: LLMProvider;

  if (provider) {
    delegate = provider === "claude" ? new ClaudeProvider() : new OpenCodeProvider();
  } else {
    const roleMapStr = process.env.ROLE_PROVIDER_MAP;
    if (roleMapStr && role) {
      try {
        const roleMap = JSON.parse(roleMapStr) as Record<string, string>;
        const p = roleMap[role]?.toLowerCase();
        if (p) {
          delegate = p === "claude" ? new ClaudeProvider() : new OpenCodeProvider();
        } else {
          delegate = createDefaultProvider();
        }
      } catch {
        delegate = createDefaultProvider();
      }
    } else {
      delegate = createDefaultProvider();
    }
  }

  const breakerName = `llm-${role || "default"}-${provider || "default"}`;
  const breaker = getBreaker(breakerName);
  return new CircuitBreakerProvider(delegate, breaker);
}

function createDefaultProvider(): LLMProvider {
  const p = process.env.LLM_PROVIDER?.toLowerCase() || "opencode";
  return p === "claude" ? new ClaudeProvider() : new OpenCodeProvider();
}

export function resetAllBreakers(): void {
  for (const breaker of breakers.values()) {
    breaker.reset();
  }
}
