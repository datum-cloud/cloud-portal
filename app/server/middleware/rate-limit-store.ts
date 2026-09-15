import { logger } from '@/modules/logger';
import type { ClientRateLimitInfo, Store } from 'hono-rate-limiter';
import { MemoryStore } from 'hono-rate-limiter';
import { RedisStore } from 'rate-limit-redis';
import type { RedisReply } from 'rate-limit-redis';

/** The slice of an ioredis client the store needs. Injected so tests need no Redis. */
export interface RedisLike {
  status: string;
  call(command: string, ...args: (string | number)[]): Promise<unknown>;
}

/** `hono-rate-limiter` does not export the init options type under its own name. */
type StoreInitOptions = Parameters<NonNullable<Store['init']>>[0];

/**
 * A rate limit store that prefers Redis while the client reports `ready` and
 * counts in memory otherwise. The same rule the auth refresh lock follows
 * (auth.service.ts): a Redis outage degrades to a per-pod limit instead of
 * turning every API call into a 500 through the store.
 *
 * `RedisStore.init` loads its Lua scripts, so it is deferred until the first
 * call that finds Redis ready and re-run after any failure. A store whose
 * script load failed at boot would otherwise never recover.
 */
export function createRateLimitStore(prefix: string, redis: RedisLike | null): Store {
  const memory = new MemoryStore();
  const redisStore = redis
    ? (new RedisStore({
        prefix,
        sendCommand: (command: string, ...args: string[]) =>
          redis.call(command, ...args) as Promise<RedisReply>,
      }) as unknown as Store)
    : null;

  let initOptions: StoreInitOptions | undefined;
  let scriptsLoaded: Promise<void> | null = null;
  let warned = false;

  const loadScripts = (): Promise<void> => {
    scriptsLoaded ??= Promise.resolve(redisStore!.init?.(initOptions!)).catch((error: unknown) => {
      scriptsLoaded = null;
      throw error;
    });
    return scriptsLoaded;
  };

  const onRedisError = (error: unknown) => {
    if (warned) return;
    warned = true;
    logger.warn('[rate-limit] Redis unavailable, counting in memory until it recovers', {
      error: error instanceof Error ? error.message : String(error),
    });
  };

  /** Runs `op` against Redis when it is ready; `null` means "use memory". */
  const viaRedis = async <T>(
    op: (store: Store) => Promise<T> | T
  ): Promise<{ value: T } | null> => {
    if (redisStore === null || redis!.status !== 'ready') return null;
    try {
      await loadScripts();
      const value = await op(redisStore);
      warned = false;
      return { value };
    } catch (error) {
      onRedisError(error);
      return null;
    }
  };

  return {
    prefix,
    localKeys: redisStore === null,
    init(options: StoreInitOptions) {
      initOptions = options;
      scriptsLoaded = null;
      memory.init(options);
    },
    async increment(key: string): Promise<ClientRateLimitInfo> {
      const hit = await viaRedis((store) => store.increment(key));
      if (hit) return hit.value;
      // MemoryStore hands back its live record; snapshot it so later hits
      // cannot rewrite a count a caller already holds.
      const { totalHits, resetTime } = memory.increment(key);
      return { totalHits, resetTime };
    },
    async decrement(key: string): Promise<void> {
      if (await viaRedis((store) => store.decrement(key))) return;
      memory.decrement(key);
    },
    async resetKey(key: string): Promise<void> {
      if (await viaRedis((store) => store.resetKey(key))) return;
      memory.resetKey(key);
    },
  };
}
