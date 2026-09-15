import { errorHandler } from './error-handler';
import {
  hasBrowserOrigin,
  resolveRateLimitProfile,
  shouldLogRejection,
  trafficClassLimiter,
  type RateLimitBudgets,
} from './rate-limit';
import { createMemoryPenaltyBox, PENALTY_TRIPS } from './rate-limit-penalty';
import type { Variables } from '@/server/types';
import { afterAll, describe, expect, test } from 'bun:test';
import { Hono } from 'hono';
import { register } from 'prom-client';

const tiny: RateLimitBudgets = { windowMs: 60_000, machine: 2, interactive: 2, ceiling: 3 };
const browser = { 'Sec-Fetch-Site': 'same-origin' };

/** Mirrors createApiApp: session in context, limiter on '*', errorHandler on the app. */
function appFor(
  budgets: RateLimitBudgets,
  extra: Partial<Parameters<typeof trafficClassLimiter>[0]> = {}
) {
  const app = new Hono<{ Variables: Variables }>();
  app.onError(errorHandler as never);
  app.use('*', async (c, next) => {
    c.set('session', { sub: 'u1' } as Variables['session']);
    c.set('requestId', 'req-1');
    await next();
  });
  app.use(
    '*',
    trafficClassLimiter({ budgets, redis: null, penaltyBox: createMemoryPenaltyBox(), ...extra })
  );
  app.get('/watch/stream', (c) => c.json({ ok: true }));
  app.get('/proxy/thing', (c) => c.json({ ok: true }));
  return app;
}

// Every file shares prom-client's default registry, and the counters here are
// registered once per process; zero them so a later file can assert absolutes.
afterAll(() => register.resetMetrics());

async function counterValue(name: string, labels: Record<string, string>) {
  const metric = await register.getSingleMetric(name)?.get();
  return (
    metric?.values.find((v) => Object.entries(labels).every(([k, val]) => v.labels[k] === val))
      ?.value ?? 0
  );
}

describe('resolveRateLimitProfile', () => {
  test('env override wins, then NODE_ENV', () => {
    expect(resolveRateLimitProfile({ RATE_LIMIT_PROFILE: 'standard', NODE_ENV: 'test' })).toBe(
      'standard'
    );
    expect(resolveRateLimitProfile({ RATE_LIMIT_PROFILE: 'bogus', NODE_ENV: 'production' })).toBe(
      'standard'
    );
    expect(resolveRateLimitProfile({ NODE_ENV: 'test' })).toBe('development');
    expect(resolveRateLimitProfile({})).toBe('development');
  });
});

describe('hasBrowserOrigin', () => {
  const app = new Hono();
  app.get('/x', (c) => c.text(hasBrowserOrigin(c as never) ? 'yes' : 'no'));

  test('Sec-Fetch-Site decides when present, Origin+Host otherwise', async () => {
    expect(await (await app.request('/x', { headers: browser })).text()).toBe('yes');
    expect(
      await (await app.request('/x', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).text()
    ).toBe('no');
    expect(
      await (
        await app.request('/x', { headers: { Origin: 'https://portal.test', Host: 'portal.test' } })
      ).text()
    ).toBe('yes');
    expect(await (await app.request('/x')).text()).toBe('no');
  });
});

describe('trafficClassLimiter', () => {
  test('exhausting the machine bucket leaves interactive routes open', async () => {
    // The ceiling counts every request, including the one the machine bucket
    // rejects, so it needs room for three watch calls plus the proxy call.
    const app = appFor({ ...tiny, ceiling: 4 });
    expect((await app.request('/watch/stream', { headers: browser })).status).toBe(200);
    expect((await app.request('/watch/stream', { headers: browser })).status).toBe(200);

    const limited = await app.request('/watch/stream', { headers: browser });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('X-RateLimit-Class')).toBe('machine');
    expect(Number(limited.headers.get('Retry-After'))).toBeGreaterThan(0);
    expect(((await limited.json()) as { code: string }).code).toBe('RATE_LIMIT_EXCEEDED');

    expect((await app.request('/proxy/thing', { headers: browser })).status).toBe(200);
  });

  test('the ceiling trips across classes and reports its own class', async () => {
    const app = appFor(tiny);
    await app.request('/watch/stream', { headers: browser });
    await app.request('/watch/stream', { headers: browser });
    await app.request('/proxy/thing', { headers: browser });

    const limited = await app.request('/proxy/thing', { headers: browser });
    expect(limited.status).toBe(429);
    expect(limited.headers.get('X-RateLimit-Class')).toBe('ceiling');
  });

  test('repeated ceiling trips put the subject in the penalty box', async () => {
    const app = appFor(tiny);
    for (let i = 0; i < tiny.ceiling; i++) await app.request('/proxy/thing', { headers: browser });
    for (let i = 0; i < PENALTY_TRIPS; i++) await app.request('/proxy/thing', { headers: browser });

    const penalised = await app.request('/watch/stream', { headers: browser });
    expect(penalised.status).toBe(429);
    expect(penalised.headers.get('X-RateLimit-Class')).toBe('penalty');
    expect(Number(penalised.headers.get('Retry-After'))).toBeGreaterThan(60);
  });

  test('a request without browser metadata is counted but not rejected by default', async () => {
    const before = await counterValue('api_nonbrowser_requests_total', { route: 'proxy' });
    const app = appFor(tiny);
    expect((await app.request('/proxy/thing')).status).toBe(200);
    expect(await counterValue('api_nonbrowser_requests_total', { route: 'proxy' })).toBe(
      before + 1
    );
  });

  test('enforcing browser origin turns that into a 403', async () => {
    const app = appFor(tiny, { enforceBrowserOrigin: true });
    expect((await app.request('/proxy/thing')).status).toBe(403);
    expect((await app.request('/proxy/thing', { headers: browser })).status).toBe(200);
  });

  test('rejections increment the counter with class and route', async () => {
    const before = await counterValue('rate_limit_rejections_total', {
      class: 'machine',
      route: 'watch',
    });
    const app = appFor(tiny);
    for (let i = 0; i <= tiny.machine; i++)
      await app.request('/watch/stream', { headers: browser });
    expect(
      await counterValue('rate_limit_rejections_total', { class: 'machine', route: 'watch' })
    ).toBe(before + 1);
  });

  test('standard RateLimit headers are present on allowed responses', async () => {
    const res = await appFor(tiny).request('/proxy/thing', { headers: browser });
    expect(res.headers.get('RateLimit-Limit')).toBe(String(tiny.interactive));
  });
});

describe('shouldLogRejection', () => {
  test('logs once per subject per interval, independently per subject', () => {
    const t0 = 1_000_000;
    expect(shouldLogRejection('log-a', t0)).toBe(true);
    expect(shouldLogRejection('log-a', t0 + 5_000)).toBe(false);
    expect(shouldLogRejection('log-b', t0 + 5_000)).toBe(true);
    expect(shouldLogRejection('log-a', t0 + 10_000)).toBe(true);
  });
});
