import { notePaused, pausedFor, resetRateLimitGate } from './gate';
import { gatedFetch } from './gated-fetch';
import { RateLimitError } from '@/utils/errors/app-error';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';

const realFetch = globalThis.fetch;

beforeEach(() => resetRateLimitGate());
afterEach(() => {
  globalThis.fetch = realFetch;
});

describe('gatedFetch', () => {
  test('passes through and records a 429 for the class the server names', async () => {
    const fetchMock = mock(
      async () =>
        new Response('{}', {
          status: 429,
          headers: { 'Retry-After': '25', 'X-RateLimit-Class': 'machine' },
        })
    );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const res = await gatedFetch('/api/permissions/bulk-check', { method: 'POST' });
    expect(res.status).toBe(429);
    expect(pausedFor('/api/watch/subscribe')).toBeGreaterThan(20);
    expect(pausedFor('/api/proxy/apis/x')).toBe(0);
  });

  test('rejects locally while paused without touching the network', async () => {
    const fetchMock = mock(async () => new Response('{}', { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    notePaused('machine', 30);

    await expect(gatedFetch('/api/prometheus', { method: 'POST' })).rejects.toBeInstanceOf(
      RateLimitError
    );
    expect(fetchMock).toHaveBeenCalledTimes(0);

    expect((await gatedFetch('/api/usage?orgId=o1')).status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('accepts URL and Request inputs', async () => {
    globalThis.fetch = mock(
      async () => new Response('{}', { status: 200 })
    ) as unknown as typeof fetch;
    expect((await gatedFetch(new URL('http://localhost/api/usage'))).status).toBe(200);
    expect((await gatedFetch(new Request('http://localhost/api/usage'))).status).toBe(200);
  });
});
