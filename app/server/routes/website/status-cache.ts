/** The subset of ioredis this cache uses; a Map-backed fallback is used when null. */
export interface KvLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
}

export interface StatusCache<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds: number): Promise<void>;
}

const PREFIX = 'website:status:';

/**
 * Per-user cache for the computed session status. Read only after the session
 * cookie has been validated, so a logout needs no invalidation: with no valid
 * cookie the route answers signed out before it looks here.
 */
export function createStatusCache<T>(
  redis: KvLike | null,
  now: () => number = Date.now
): StatusCache<T> {
  if (redis) {
    return {
      async get(key) {
        try {
          const raw = await redis.get(PREFIX + key);
          return raw ? (JSON.parse(raw) as T) : null;
        } catch {
          return null;
        }
      },
      async set(key, value, ttlSeconds) {
        try {
          await redis.set(PREFIX + key, JSON.stringify(value), 'EX', ttlSeconds);
        } catch {
          // A cache write failure only costs a recompute on the next request.
        }
      },
    };
  }

  const memory = new Map<string, { value: T; expiresAt: number }>();
  return {
    async get(key) {
      const hit = memory.get(key);
      if (!hit) return null;
      if (hit.expiresAt <= now()) {
        memory.delete(key);
        return null;
      }
      return hit.value;
    },
    async set(key, value, ttlSeconds) {
      memory.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
    },
  };
}
