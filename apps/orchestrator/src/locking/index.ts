import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

const LOCK_TTL_MS = 10_000;
const LOCK_RETRY_MS = 50;
const LOCK_MAX_RETRIES = 200;

let sharedLockClient: IORedis.default | null = null;

export function getLockClient(): IORedis.default {
  if (!sharedLockClient) {
    sharedLockClient = new IORedis.default(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return sharedLockClient;
}

export async function closeLockClient(): Promise<void> {
  if (sharedLockClient) {
    await sharedLockClient.quit();
    sharedLockClient = null;
  }
}

/**
 * Acquire a distributed lock with retry and TTL.
 * Returns the lock token if acquired, null if timed out.
 * The token MUST be passed to releaseLock to prevent releasing someone else's lock.
 */
export async function acquireLock(
  key: string,
  ttlMs: number = LOCK_TTL_MS,
): Promise<string | null> {
  const client = getLockClient();
  const token = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const lockKey = `lock:${key}`;

  for (let i = 0; i < LOCK_MAX_RETRIES; i++) {
    const result = await client.set(lockKey, token, "PX", ttlMs, "NX");
    if (result === "OK") {
      return token;
    }
    await sleep(LOCK_RETRY_MS);
  }

  console.warn(`[Lock] Failed to acquire lock: ${key} after ${LOCK_MAX_RETRIES} retries`);
  return null;
}

/**
 * Release a distributed lock. Only succeeds if the token matches (prevents releasing someone else's lock).
 */
export async function releaseLock(key: string, token: string): Promise<boolean> {
  const client = getLockClient();
  const lockKey = `lock:${key}`;

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  const result = await client.eval(script, 1, lockKey, token);
  return result === 1;
}

/**
 * Execute a function while holding a distributed lock.
 * If the lock cannot be acquired, returns null.
 */
export async function withLock<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs?: number,
): Promise<T | null> {
  const token = await acquireLock(key, ttlMs);
  if (!token) {
    return null;
  }

  try {
    return await fn();
  } finally {
    await releaseLock(key, token);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
