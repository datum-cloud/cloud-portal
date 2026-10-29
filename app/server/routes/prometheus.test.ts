import { PrometheusService } from '@/modules/prometheus';
import { PrometheusError } from '@/modules/prometheus/errors';
import type { Variables } from '@/server/types';
import { afterAll, describe, expect, it, mock, spyOn } from 'bun:test';
import { Hono } from 'hono';

const INTERNAL_URL = 'http://vmselect.telemetry-system.svc.cluster.local:8481';
const UPSTREAM_TEXT = `parse error at char 4: unexpected "}" (from ${INTERNAL_URL}/api/v1/query)`;

let nextFailure: unknown = null;

// Merge into whatever env is loaded rather than replacing it: module mocks are
// process-wide in bun, so a partial env would leak into later test files.
const { env: loadedEnv } = await import('@/utils/env/env.server');
mock.module('@/utils/env/env.server', () => ({
  env: { ...loadedEnv, server: { ...loadedEnv.server, prometheusUrl: INTERNAL_URL } },
}));

// Stub the one method the route calls instead of mocking '@/modules/prometheus',
// which other test files import for PrometheusError.
const handleAPIRequest = spyOn(PrometheusService.prototype, 'handleAPIRequest').mockImplementation(
  async () => {
    if (nextFailure) throw nextFailure;
    return { ok: true };
  }
);
afterAll(() => handleAPIRequest.mockRestore());

const { prometheusRoutes } = await import('./prometheus');

function app(withSession = true) {
  const a = new Hono<{ Variables: Variables }>();
  a.use('*', async (c, next) => {
    if (withSession) {
      c.set('session', { sub: 'u1', accessToken: 'the-token' } as Variables['session']);
    }
    await next();
  });
  a.route('/', prometheusRoutes);
  return a;
}

function query(a: Hono<{ Variables: Variables }>) {
  return a.request('/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'card', query: 'up' }),
  });
}

describe('prometheus route', () => {
  it('does not expose the internal Prometheus URL on the health check', async () => {
    const res = await app().request('/');
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ configured: true });
    expect(text).not.toContain('vmselect');
  });

  it('rejects an unauthenticated query', async () => {
    const res = await query(app(false));
    expect(res.status).toBe(401);
  });

  it('returns query results on success', async () => {
    nextFailure = null;
    const res = await query(app());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, data: { ok: true } });
  });

  it.each([
    [PrometheusError.network(UPSTREAM_TEXT, 503, 'server_error'), 503, 'network'],
    [PrometheusError.query(UPSTREAM_TEXT, 'bad_data'), 500, 'query'],
    [PrometheusError.timeout(UPSTREAM_TEXT), 500, 'timeout'],
    [PrometheusError.network(UPSTREAM_TEXT, 403, 'forbidden'), 403, 'network'],
  ] as const)(
    'answers %#: a generic message, never upstream text or URL',
    async (error, status, type) => {
      nextFailure = error;
      const res = await query(app());
      const text = await res.text();

      expect(res.status).toBe(status);
      const body = JSON.parse(text);
      expect(body.type).toBe(type);
      expect(body.details).toBeUndefined();
      expect(text).not.toContain('parse error');
      expect(text).not.toContain(INTERNAL_URL);
      expect(text).not.toContain('vmselect');
    }
  );

  it('answers a non-Prometheus failure with a generic 500', async () => {
    nextFailure = new Error(`ECONNREFUSED ${INTERNAL_URL}`);
    const res = await query(app());
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(JSON.parse(text)).toEqual({ error: 'Internal server error' });
    expect(text).not.toContain('vmselect');
  });
});
