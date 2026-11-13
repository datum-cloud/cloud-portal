import { makeRoom } from './bounded-map';
import { createMemoryWindowLimiter } from './feedback/memory-limiter';
import { createTtlCache } from './ttl-cache';
import { describe, expect, test } from 'vitest';

describe('makeRoom', () => {
  const expired = (value: { expired: boolean }) => value.expired;

  test('leaves a map below the cap alone', () => {
    const map = new Map([['a', { expired: true }]]);

    makeRoom(map, expired, 2);

    expect([...map.keys()]).toEqual(['a']);
  });

  test('drops expired entries before live ones', () => {
    const map = new Map([
      ['old-live', { expired: false }],
      ['expired', { expired: true }],
    ]);

    makeRoom(map, expired, 2);

    expect([...map.keys()]).toEqual(['old-live']);
  });

  test('drops the oldest entry when nothing has expired', () => {
    const map = new Map([
      ['oldest', { expired: false }],
      ['newer', { expired: false }],
    ]);

    makeRoom(map, expired, 2);

    expect([...map.keys()]).toEqual(['newer']);
  });
});

describe('createTtlCache in memory', () => {
  test('never holds more than the cap and evicts the oldest write', async () => {
    const cache = createTtlCache<number>(null, 'p:', () => 0, 3);

    for (let i = 0; i < 10; i++) await cache.set(`k${i}`, i, 60);

    expect(await cache.get('k6')).toBeNull();
    expect(await cache.get('k7')).toBe(7);
    expect(await cache.get('k8')).toBe(8);
    expect(await cache.get('k9')).toBe(9);
  });

  test('rewriting a key keeps it from being the next one evicted', async () => {
    const cache = createTtlCache<string>(null, 'p:', () => 0, 2);

    await cache.set('a', 'a1', 60);
    await cache.set('b', 'b1', 60);
    await cache.set('a', 'a2', 60);
    await cache.set('c', 'c1', 60);

    expect(await cache.get('a')).toBe('a2');
    expect(await cache.get('b')).toBeNull();
    expect(await cache.get('c')).toBe('c1');
  });

  test('expired entries go first, so live ones survive a full cache', async () => {
    let now = 0;
    const cache = createTtlCache<string>(null, 'p:', () => now, 2);

    await cache.set('short', 's', 1);
    await cache.set('long', 'l', 60);
    now = 2000;
    await cache.set('new', 'n', 60);

    expect(await cache.get('short')).toBeNull();
    expect(await cache.get('long')).toBe('l');
    expect(await cache.get('new')).toBe('n');
  });
});

describe('createMemoryWindowLimiter', () => {
  const options = { windowMs: 1000, maxPerWindow: 2 };

  test('allows the budget, then rejects until the window resets', () => {
    let now = 0;
    const limiter = createMemoryWindowLimiter({ ...options, now: () => now });

    expect(limiter.overLimit('u1')).toBe(false);
    expect(limiter.overLimit('u1')).toBe(false);
    expect(limiter.overLimit('u1')).toBe(true);
    now = 1000;
    expect(limiter.overLimit('u1')).toBe(false);
  });

  test('never tracks more users than the cap', () => {
    const limiter = createMemoryWindowLimiter({ ...options, maxEntries: 5, now: () => 0 });

    for (let i = 0; i < 100; i++) limiter.overLimit(`u${i}`);

    expect(limiter.size()).toBe(5);
  });

  test('a full map sheds finished windows before a live one', () => {
    let now = 0;
    const limiter = createMemoryWindowLimiter({ ...options, maxEntries: 2, now: () => now });

    limiter.overLimit('gone');
    now = 500;
    limiter.overLimit('live');
    limiter.overLimit('live');
    now = 1200;
    limiter.overLimit('new');

    expect(limiter.size()).toBe(2);
    expect(limiter.overLimit('live')).toBe(true);
  });
});
