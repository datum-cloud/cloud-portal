import { makeRoom, MEMORY_MAX_ENTRIES } from './bounded-map';

/** The subset of ioredis this cache uses; a Map-backed fallback is used when null. */
export interface KvLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: 'EX', ttlSeconds: number): Promise<unknown>;
}

/** A JSON value cache with per-entry TTL. Reads and writes never throw. */
export interface TtlCache<T> {
  get(key: string): Promise<T | null>;
  set(key: string, value: T, ttlSeconds: number): Promise<void>;
}

/**
 * TTL cache for the website routes, in Redis under `prefix` or, when `redis` is
 * null, in memory. Callers key it per user and read it only after the session
 * cookie has been validated, so a logout needs no invalidation: with no valid
 * cookie the route answers before it looks here.
 *
 * The in-memory fallback holds at most `maxEntries` keys. At the cap a write
 * drops expired entries first, then the oldest written ones.
 */
export function createTtlCache<T>(
  redis: KvLike | null,
  prefix: string,
  now: () => number = Date.now,
  maxEntries: number = MEMORY_MAX_ENTRIES
): TtlCache<T> {
  if (redis) {
    return {
      async get(key) {
        try {
          const raw = await redis.get(prefix + key);
          return raw ? (JSON.parse(raw) as T) : null;
        } catch {
          return null;
        }
      },
      async set(key, value, ttlSeconds) {
        try {
          await redis.set(prefix + key, JSON.stringify(value), 'EX', ttlSeconds);
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
      const ts = now();
      // Delete first so a rewritten key counts as the newest insertion.
      memory.delete(key);
      makeRoom(memory, (entry) => entry.expiresAt <= ts, maxEntries);
      memory.set(key, { value, expiresAt: ts + ttlSeconds * 1000 });
    },
  };
}
