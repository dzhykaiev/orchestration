const DEFAULT_FAILURE_THRESHOLD = 3;
const DEFAULT_RESET_TIMEOUT_MS = 60_000;

type CircuitState = "closed" | "open" | "half_open";

interface CircuitBreakerOptions {
  failureThreshold?: number;
  resetTimeoutMs?: number;
  name: string;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeoutMs: number;
  readonly name: string;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD;
    this.resetTimeoutMs = options.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkState();

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  get currentState(): CircuitState {
    if (this.state === "open") {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.resetTimeoutMs) {
        return "half_open";
      }
    }
    return this.state;
  }

  get isOpen(): boolean {
    return this.currentState === "open";
  }

  private checkState(): void {
    const current = this.currentState;
    if (current === "open") {
      throw new Error(
        `Circuit breaker "${this.name}" is OPEN — LLM provider failing. Will retry in ${this.resetTimeoutMs}ms.`,
      );
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === "half_open") {
      console.log(`[CircuitBreaker] ${this.name}: HALF_OPEN -> CLOSED (recovered)`);
    }
    this.state = "closed";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "half_open") {
      console.warn(`[CircuitBreaker] ${this.name}: HALF_OPEN -> OPEN (test request failed)`);
      this.state = "open";
      return;
    }

    if (this.failureCount >= this.failureThreshold) {
      console.warn(
        `[CircuitBreaker] ${this.name}: CLOSED -> OPEN (${this.failureCount} consecutive failures)`,
      );
      this.state = "open";
    }
  }

  reset(): void {
    console.log(`[CircuitBreaker] ${this.name}: manual reset`);
    this.state = "closed";
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}
