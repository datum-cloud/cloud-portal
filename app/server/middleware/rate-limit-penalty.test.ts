import {
  createMemoryPenaltyBox,
  createRedisPenaltyBox,
  PENALTY_DURATION_SEC,
  PENALTY_TRIP_WINDOW_SEC,
  PENALTY_TRIPS,
} from './rate-limit-penalty';
import type { RedisLike } from './rate-limit-store';
import { describe, expect, test } from 'bun:test';

/** Enough of INCR/EXPIRE/SET/DEL/TTL to drive the Redis penalty box. */
function fakeRedis(status = 'ready') {
  const values = new Map<string, number>();
  const ttls = new Map<string, number>();
  const redis: RedisLike & { values: Map<string, number>; ttls: Map<string, number> } = {
    status,
    values,
    ttls,
    async call(command, ...args) {
      const key = String(args[0]);
      switch (command) {
        case 'INCR': {
          const next = (values.get(key) ?? 0) + 1;
          values.set(key, next);
          return next;
        }
        case 'EXPIRE':
          ttls.set(key, Number(args[1]));
          return 1;
        case 'SET':
          values.set(key, 1);
          ttls.set(key, Number(args[3]));
          return 'OK';
        case 'DEL':
          values.delete(key);
          ttls.delete(key);
          return 1;
        case 'TTL':
          return values.has(key) ? (ttls.get(key) ?? -1) : -2;
        default:
          return null;
      }
    },
  };
  return redis;
}

describe('memory penalty box', () => {
  test('penalises on the third trip and reports remaining seconds', async () => {
    let now = 1_000_000;
    const box = createMemoryPenaltyBox(() => now);

    expect(await box.recordTrip('u1')).toBe(false);
    expect(await box.recordTrip('u1')).toBe(false);
    expect(await box.remaining('u1')).toBe(0);
    expect(await box.recordTrip('u1')).toBe(true);
    expect(await box.remaining('u1')).toBe(PENALTY_DURATION_SEC);

    now += (PENALTY_DURATION_SEC + 1) * 1000;
    expect(await box.remaining('u1')).toBe(0);
  });

  test('trips outside the window do not accumulate', async () => {
    let now = 0;
    const box = createMemoryPenaltyBox(() => now);
    await box.recordTrip('u1');
    await box.recordTrip('u1');
    now += (PENALTY_TRIP_WINDOW_SEC + 1) * 1000;
    expect(await box.recordTrip('u1')).toBe(false);
  });
});

describe('redis penalty box', () => {
  test('uses INCR/EXPIRE for trips and SET EX for the penalty', async () => {
    const redis = fakeRedis();
    const box = createRedisPenaltyBox(redis);

    for (let i = 1; i < PENALTY_TRIPS; i++) expect(await box.recordTrip('u1')).toBe(false);
    expect(redis.ttls.get('ratelimit:trips:u1')).toBe(PENALTY_TRIP_WINDOW_SEC);

    expect(await box.recordTrip('u1')).toBe(true);
    expect(redis.values.has('ratelimit:trips:u1')).toBe(false);
    expect(await box.remaining('u1')).toBe(PENALTY_DURATION_SEC);
    expect(await box.remaining('u2')).toBe(0);
  });

  test('re-arms the trip window when the key has no TTL', async () => {
    const redis = fakeRedis();
    // A first trip whose EXPIRE never landed: the key exists with no TTL.
    redis.values.set('ratelimit:trips:u3', 1);
    const box = createRedisPenaltyBox(redis);

    expect(await box.recordTrip('u3')).toBe(false);
    expect(redis.values.get('ratelimit:trips:u3')).toBe(2);
    expect(redis.ttls.get('ratelimit:trips:u3')).toBe(PENALTY_TRIP_WINDOW_SEC);
  });

  test('falls back to memory when Redis is not ready or throws', async () => {
    const redis = fakeRedis('connecting');
    const box = createRedisPenaltyBox(redis);
    for (let i = 1; i < PENALTY_TRIPS; i++) await box.recordTrip('u1');
    expect(await box.recordTrip('u1')).toBe(true);
    expect(redis.values.size).toBe(0);

    const broken = fakeRedis('ready');
    broken.call = async () => {
      throw new Error('ECONNRESET');
    };
    const box2 = createRedisPenaltyBox(broken);
    expect(await box2.remaining('u1')).toBe(0);
    expect(await box2.recordTrip('u1')).toBe(false);
  });
});
