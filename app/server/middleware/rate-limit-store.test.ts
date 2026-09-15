import { createRateLimitStore, type RedisLike } from './rate-limit-store';
import { describe, expect, test } from 'bun:test';

function fakeRedis(status = 'ready'): RedisLike & { hits: Map<string, number>; calls: string[] } {
  const hits = new Map<string, number>();
  const calls: string[] = [];
  return {
    status,
    hits,
    calls,
    async call(command, ...args) {
      calls.push(command);
      if (command === 'SCRIPT') return 'fake-sha';
      if (command === 'EVALSHA') {
        const key = String(args[2]);
        const next = (hits.get(key) ?? 0) + 1;
        hits.set(key, next);
        return [next, 60_000];
      }
      return null;
    },
  };
}

const windowMs = 60_000;

describe('createRateLimitStore', () => {
  test('counts in Redis while the client is ready', async () => {
    const redis = fakeRedis('ready');
    const store = createRateLimitStore('ratelimit:', redis);
    store.init?.({ windowMs } as never);

    const first = await store.increment('ceiling:u1');
    const second = await store.increment('ceiling:u1');

    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
    expect(redis.calls).toContain('EVALSHA');
  });

  test('counts in memory while the client is not ready', async () => {
    const redis = fakeRedis('connecting');
    const store = createRateLimitStore('ratelimit:', redis);
    store.init?.({ windowMs } as never);

    const first = await store.increment('ceiling:u1');
    const second = await store.increment('ceiling:u1');

    expect(second.totalHits).toBe(first.totalHits + 1);
    expect(redis.calls).not.toContain('EVALSHA');
  });

  test('falls back to memory when Redis throws, and keeps serving', async () => {
    const redis = fakeRedis('ready');
    redis.call = async () => {
      throw new Error('ECONNRESET');
    };
    const store = createRateLimitStore('ratelimit:', redis);
    store.init?.({ windowMs } as never);

    const first = await store.increment('machine:u1');
    const second = await store.increment('machine:u1');

    expect(first.totalHits).toBe(1);
    expect(second.totalHits).toBe(2);
  });

  test('with no Redis client at all it is a plain memory store', async () => {
    const store = createRateLimitStore('ratelimit:', null);
    store.init?.({ windowMs } as never);
    expect((await store.increment('k')).totalHits).toBe(1);
  });
});
