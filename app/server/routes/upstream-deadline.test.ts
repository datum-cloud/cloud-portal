import type { Variables } from '@/server/types';
import { Hono } from 'hono';
import { afterEach, beforeEach, describe, expect, type MockInstance, test, vi } from 'vitest';

const TEST_TIMEOUT_MS = 30;

vi.mock('@/modules/axios/upstream-timeout', () => ({ UPSTREAM_TIMEOUT_MS: 30 }));
vi.mock('@/utils/env/env.server', () => ({
  env: { public: { apiUrl: 'http://api.test', graphqlUrl: 'http://gql.test' } },
}));
vi.mock('@/utils/auth', () => ({ AuthService: {} }));
const { warn } = vi.hoisted(() => ({ warn: vi.fn() }));
vi.mock('@/modules/logger', () => ({
  logger: { warn, error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

const { proxyRoutes } = await import('./proxy');
const { graphqlRoutes } = await import('./graphql');
const { reportDeadlineCutoff } = await import('./upstream-deadline');

function appWithSession() {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('session', { sub: 'u1', accessToken: 't' } as Variables['session']);
    c.set('requestId', 'req-1');
    await next();
  });
  app.route('/api/proxy', proxyRoutes);
  app.route('/api/graphql', graphqlRoutes);
  return app;
}

/** An upstream that never answers: settles only when its signal aborts. */
function hangingFetch() {
  return vi.fn(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
      })
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('upstream deadline', () => {
  let error: MockInstance<typeof console.error>;

  beforeEach(() => {
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    error.mockRestore();
    vi.unstubAllGlobals();
  });

  test('a hung API server is a 504 with the proxy error shape', async () => {
    const fetchMock = hangingFetch();
    vi.stubGlobal('fetch', fetchMock);

    const res = await appWithSession().request('/api/proxy/apis/example/v1/things');

    expect(res.status).toBe(504);
    expect(await res.json()).toEqual({ error: 'Upstream request timed out' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('a hung GraphQL gateway is a 504 on the global and scoped endpoints', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const init = { method: 'POST', body: JSON.stringify({ query: '{ __typename }' }) };

    const global = await appWithSession().request('/api/graphql', init);
    const scoped = await appWithSession().request('/api/graphql/org/acme', init);

    expect(global.status).toBe(504);
    expect(await global.json()).toEqual({ error: 'Upstream request timed out' });
    expect(scoped.status).toBe(504);
  });

  test('a client disconnect is still a 499, not a timeout', async () => {
    vi.stubGlobal('fetch', hangingFetch());
    const client = new AbortController();

    const pending = appWithSession().request('/api/proxy/apis/example/v1/things', {
      signal: client.signal,
    });
    client.abort();

    expect((await pending).status).toBe(499);
  });

  test('a watch stream outlives the deadline', async () => {
    let upstreamSignal: AbortSignal | undefined;
    const encoder = new TextEncoder();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
        upstreamSignal = init?.signal ?? undefined;
        const body = new ReadableStream<Uint8Array>({
          async start(controller) {
            controller.enqueue(encoder.encode('{"type":"ADDED"}\n'));
            await sleep(TEST_TIMEOUT_MS * 3);
            controller.enqueue(encoder.encode('{"type":"MODIFIED"}\n'));
            controller.close();
          },
        });
        return new Response(body, { status: 200 });
      })
    );

    const res = await appWithSession().request('/api/proxy/apis/example/v1/things?watch=true');
    const text = await res.text();

    expect(res.status).toBe(200);
    expect(text).toBe('{"type":"ADDED"}\n{"type":"MODIFIED"}\n');
    expect(upstreamSignal?.aborted).toBe(false);
  });

  test('a slow watch connect is not cut by the deadline', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        await sleep(TEST_TIMEOUT_MS * 3);
        return new Response('{"type":"ADDED"}\n', { status: 200 });
      })
    );

    const res = await appWithSession().request('/api/proxy/apis/example/v1/things?watch=true');

    expect(res.status).toBe(200);
  });
});

/** An upstream that sends a 200 and part of the body, then stalls until its signal aborts. */
function stallingBodyFetch() {
  return vi.fn((_url: string | URL | Request, init?: RequestInit) => {
    const signal = init?.signal;
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"items":['));
        signal?.addEventListener('abort', () => controller.error(signal.reason), { once: true });
      },
    });
    return Promise.resolve(new Response(body, { status: 200 }));
  });
}

const timeout = () => new DOMException('The operation timed out.', 'TimeoutError');
const disconnect = () => new DOMException('The operation was aborted.', 'AbortError');

async function drain(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  while (!(await reader.read()).done);
}

describe('deadline cut-off reporting', () => {
  beforeEach(() => {
    warn.mockClear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test('the proxy logs a 200 whose body the deadline cuts off', async () => {
    vi.stubGlobal('fetch', stallingBodyFetch());

    const res = await appWithSession().request('/api/proxy/apis/example/v1/things');

    expect(res.status).toBe(200);
    await expect(res.text()).rejects.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('cut off'),
      expect.objectContaining({
        method: 'GET',
        path: expect.stringContaining('/apis/example/v1/things'),
        requestId: 'req-1',
      })
    );
  });

  test('reports a body the deadline aborts before it finishes, once', () => {
    const controller = new AbortController();
    const onCutoff = vi.fn();
    const body = new ReadableStream<Uint8Array>({ start: () => undefined });

    reportDeadlineCutoff(body, controller.signal, onCutoff);
    controller.abort(timeout());

    expect(onCutoff).toHaveBeenCalledTimes(1);
  });

  test('stays quiet when the body finishes before the deadline', async () => {
    const controller = new AbortController();
    const onCutoff = vi.fn();
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new Uint8Array([1]));
        c.close();
      },
    });

    await drain(reportDeadlineCutoff(body, controller.signal, onCutoff));
    controller.abort(timeout());

    expect(onCutoff).not.toHaveBeenCalled();
  });

  test('stays quiet when the browser disconnects', () => {
    const controller = new AbortController();
    const onCutoff = vi.fn();
    const body = new ReadableStream<Uint8Array>({ start: () => undefined });

    reportDeadlineCutoff(body, controller.signal, onCutoff);
    controller.abort(disconnect());

    expect(onCutoff).not.toHaveBeenCalled();
  });
});
