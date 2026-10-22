import type { PluginRegistryEntry } from '../types';
import { errorHandler } from '@/server/middleware/error-handler';
import { trafficClassLimiter } from '@/server/middleware/rate-limit';
import { createMemoryPenaltyBox } from '@/server/middleware/rate-limit-penalty';
import type { Variables } from '@/server/types';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { Hono } from 'hono';

// The registry is the only collaborator; serve one known plugin from it.
const PLUGIN = {
  spec: { slug: 'compute', assets: { baseURL: 'http://plugin.internal.test/ui' } },
  devMode: false,
} as unknown as PluginRegistryEntry;

vi.mock('./index', () => ({
  getPlugin: (slug: string) => (slug === 'compute' ? PLUGIN : undefined),
  getPlugins: () => [],
}));

const { createPluginRoutes, isHashedAsset } = await import('./routes');

describe('isHashedAsset', () => {
  test('treats content-hashed chunks under assets/ as safe to cache forever', () => {
    expect(isHashedAsset('assets/workload-list-B5GXmtQc.js')).toBe(true);
    expect(isHashedAsset('assets/index-78ywSFxD.js')).toBe(true);
  });

  test('treats fixed-name entry points as not safe to cache forever', () => {
    // These keep the same URL across every build, so a browser that cached
    // them long-lived would never see a redeploy without a manual hard
    // refresh — the exact bug this guards against.
    expect(isHashedAsset('remoteEntry.js')).toBe(false);
    expect(isHashedAsset('remoteEntry.ssr.js')).toBe(false);
    expect(isHashedAsset('plugin-manifest.json')).toBe(false);
    expect(isHashedAsset('mf-manifest.json')).toBe(false);
    expect(isHashedAsset('mf-stats.json')).toBe(false);
    expect(isHashedAsset('index.html')).toBe(false);
  });

  test('does not treat a path merely containing "assets" as hashed', () => {
    expect(isHashedAsset('my-assets/foo.js')).toBe(false);
  });
});

/**
 * Mirrors entry.ts: the global session middleware has already resolved the
 * session cookie (stubbed here by a header), errorHandler renders thrown
 * AuthenticationError and RateLimitError, and the routes mount at /api/plugins.
 */
function appFor(interactive = 100) {
  const app = new Hono<{ Variables: Variables }>();
  app.onError(errorHandler as never);
  app.use('*', async (c, next) => {
    c.set('requestId', 'req-1');
    if (c.req.header('x-test-session')) {
      c.set('session', { sub: c.req.header('x-test-session') } as Variables['session']);
    }
    await next();
  });
  app.route(
    '/api/plugins',
    createPluginRoutes({
      rateLimiter: trafficClassLimiter({
        budgets: { windowMs: 60_000, machine: 100, interactive, ceiling: 100 },
        redis: null,
        penaltyBox: createMemoryPenaltyBox(),
      }),
    })
  );
  return app;
}

const signedIn = { 'x-test-session': 'u1', 'Sec-Fetch-Site': 'same-origin', Cookie: 'session=abc' };

describe('plugin routes', () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls: { url: string; init: RequestInit }[] = [];

  function upstream(respond: () => Response | Promise<Response>) {
    upstreamCalls = [];
    globalThis.fetch = vi.fn((url: string, init: RequestInit) => {
      upstreamCalls.push({ url, init });
      return Promise.resolve().then(respond);
    }) as unknown as typeof fetch;
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  test('serves an asset to a signed-in user', async () => {
    upstream(
      () =>
        new Response('export const x = 1;', {
          status: 200,
          headers: { 'content-type': 'text/javascript', etag: '"v1"' },
        })
    );

    const res = await appFor().request('/api/plugins/compute/assets/index-abc123.js', {
      headers: signedIn,
    });

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('export const x = 1;');
    expect(res.headers.get('content-type')).toBe('text/javascript');
    expect(res.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(upstreamCalls.map((call) => call.url)).toEqual([
      'http://plugin.internal.test/ui/assets/index-abc123.js',
    ]);
    // The session cookie authenticates the user to the portal; it is never
    // forwarded to the plugin origin.
    const forwarded = upstreamCalls[0]?.init.headers as Record<string, string>;
    expect(forwarded.cookie ?? forwarded.Cookie).toBeUndefined();
  });

  test('serves the remote entry and passes a 304 revalidation through', async () => {
    upstream(() => new Response(null, { status: 304, headers: { etag: '"v1"' } }));

    const res = await appFor().request('/api/plugins/compute/remoteEntry.js', {
      headers: { ...signedIn, 'if-none-match': '"v1"' },
    });

    expect(res.status).toBe(304);
    expect(res.headers.get('cache-control')).toBe('no-cache');
  });

  test('refuses an asset without a session and never calls upstream', async () => {
    upstream(() => new Response('should not be served'));

    const res = await appFor().request('/api/plugins/compute/remoteEntry.js');

    expect(res.status).toBe(401);
    expect(upstreamCalls).toEqual([]);
  });

  test('refuses the plugin list without a session', async () => {
    const res = await appFor().request('/api/plugins');
    expect(res.status).toBe(401);
  });

  test('serves the plugin list to a signed-in user', async () => {
    const res = await appFor().request('/api/plugins', { headers: signedIn });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('rate limits asset requests per user', async () => {
    upstream(() => new Response('ok'));
    const app = appFor(2);
    const get = () => app.request('/api/plugins/compute/remoteEntry.js', { headers: signedIn });

    expect((await get()).status).toBe(200);
    expect((await get()).status).toBe(200);
    expect((await get()).status).toBe(429);
    expect(upstreamCalls).toHaveLength(2);
  });

  test('answers an unreachable plugin origin without echoing the error', async () => {
    upstream(() => Promise.reject(new Error('connect ECONNREFUSED 10.0.0.5:8080')));

    const res = await appFor().request('/api/plugins/compute/remoteEntry.js', {
      headers: signedIn,
    });
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(JSON.parse(text)).toEqual({ error: 'Plugin asset unavailable' });
    expect(text).not.toContain('10.0.0.5');
  });

  test('replaces an upstream error body with a generic one', async () => {
    upstream(
      () =>
        new Response('panic: nil pointer at /srv/plugin/internal/handler.go:42', { status: 500 })
    );

    const res = await appFor().request('/api/plugins/compute/remoteEntry.js', {
      headers: signedIn,
    });
    const text = await res.text();

    expect(res.status).toBe(502);
    expect(text).not.toContain('handler.go');
  });

  test('keeps a missing asset a 404', async () => {
    upstream(() => new Response('<html>nginx 404 /srv/plugin</html>', { status: 404 }));

    const res = await appFor().request('/api/plugins/compute/assets/gone-123.js', {
      headers: signedIn,
    });
    const text = await res.text();

    expect(res.status).toBe(404);
    expect(text).not.toContain('nginx');
  });

  test('answers an unknown plugin with 404 without calling upstream', async () => {
    upstream(() => new Response('nope'));

    const res = await appFor().request('/api/plugins/unknown/remoteEntry.js', {
      headers: signedIn,
    });

    expect(res.status).toBe(404);
    expect(upstreamCalls).toEqual([]);
  });
});
