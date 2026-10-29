import type { Variables } from '@/server/types';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { Hono } from 'hono';

// This route is a byte-for-byte proxy to the assistant's own
// /chat/conversations/{contextId}/sendmessage — see assistant-chat.ts's own
// doc comment for why it carries no protocol knowledge. These tests verify
// only what this route owns: auth-gating, forwarding request shape upstream,
// and piping the response back unmodified — not the SSE vocabulary itself,
// which belongs to the assistant repo.
mock.module('@/utils/env/env.server', () => ({
  env: { server: { assistantA2aUrl: 'http://assistant.internal.test' } },
}));

const { assistantChatRoutes } = await import('./assistant-chat');

function appWithSession() {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('session', { sub: 'u1', accessToken: 'the-token' } as Variables['session']);
    await next();
  });
  app.route('/', assistantChatRoutes);
  return app;
}

describe('assistant-chat', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('rejects an unauthenticated request without calling upstream', async () => {
    let called = false;
    globalThis.fetch = mock(() => {
      called = true;
      throw new Error('should not be called');
    }) as unknown as typeof fetch;

    const app = new Hono<{ Variables: Variables }>();
    app.route('/', assistantChatRoutes);
    const res = await app.request('/conversations/c1/sendmessage', {
      method: 'POST',
      body: JSON.stringify({ text: 'hi' }),
    });

    expect(res.status).toBe(401);
    expect(called).toBe(false);
  });

  it('forwards the bearer token, path, query, and body to the assistant chat endpoint', async () => {
    let seenUrl = '';
    let seenInit: RequestInit = {};
    globalThis.fetch = mock((url: string, init: RequestInit) => {
      seenUrl = url;
      seenInit = init;
      return Promise.resolve(
        new Response('data: {"type":"done","state":"completed"}\n\n', {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        })
      );
    }) as unknown as typeof fetch;

    const res = await appWithSession().request(
      '/conversations/ctx-1/sendmessage?projectId=proj-1',
      {
        method: 'POST',
        body: JSON.stringify({ text: 'hello' }),
      }
    );

    expect(seenUrl).toBe(
      'http://assistant.internal.test/chat/conversations/ctx-1/sendmessage?projectId=proj-1'
    );
    expect((seenInit.headers as Record<string, string>).Authorization).toBe('Bearer the-token');
    expect(seenInit.body).toBe(JSON.stringify({ text: 'hello' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('text/event-stream');
    expect(await res.text()).toBe('data: {"type":"done","state":"completed"}\n\n');
  });

  it('passes through an upstream error status and body unmodified', async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ error: 'text is required' }), { status: 400 }))
    ) as unknown as typeof fetch;

    const res = await appWithSession().request('/conversations/c1/sendmessage?projectId=p1', {
      method: 'POST',
      body: JSON.stringify({ text: '' }),
    });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'text is required' });
  });

  it('answers 502 when the assistant is unreachable', async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error('connect refused'))
    ) as unknown as typeof fetch;

    const res = await appWithSession().request('/conversations/c1/sendmessage?projectId=p1', {
      method: 'POST',
      body: JSON.stringify({ text: 'hi' }),
    });

    expect(res.status).toBe(502);
  });
});

describe('assistant-chat upstream URL params', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  function trackUpstream(): { calls: string[] } {
    const seen = { calls: [] as string[] };
    globalThis.fetch = mock((url: string) => {
      seen.calls.push(url);
      return Promise.resolve(new Response('', { status: 200 }));
    }) as unknown as typeof fetch;
    return seen;
  }

  function send(path: string) {
    return appWithSession().request(path, { method: 'POST', body: JSON.stringify({ text: 'hi' }) });
  }

  // `%2e%2e` and literal `..` are folded away by URL parsing before routing,
  // so they never match the route; the encoded-slash forms survive parsing and
  // reach the validator decoded.
  it.each([
    '/conversations/..%2F..%2Fadmin/sendmessage?projectId=p1',
    '/conversations/%2e%2e%2Fadmin/sendmessage?projectId=p1',
    '/conversations/a%2Fb/sendmessage?projectId=p1',
    '/conversations/c1%3Fx%3D1/sendmessage?projectId=p1',
    '/conversations/c1%23frag/sendmessage?projectId=p1',
    '/conversations/UPPER/sendmessage?projectId=p1',
  ])('rejects contextId in %s with 400 and never calls upstream', async (path) => {
    const seen = trackUpstream();
    const res = await send(path);
    expect(res.status).toBe(400);
    expect(seen.calls).toEqual([]);
  });

  it.each([
    '/conversations/%2e%2e/sendmessage?projectId=p1',
    '/conversations/../sendmessage?projectId=p1',
  ])('never reaches upstream for dot-segment path %s', async (path) => {
    const seen = trackUpstream();
    const res = await send(path);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(seen.calls).toEqual([]);
  });

  it.each([
    '/conversations/c1/sendmessage?projectId=..%2Fother',
    '/conversations/c1/sendmessage?projectId=p1%26admin%3Dtrue',
    '/conversations/c1/sendmessage?projectId=p1%23x',
    '/conversations/c1/sendmessage?projectId=',
  ])('rejects projectId in %s with 400 and never calls upstream', async (path) => {
    const seen = trackUpstream();
    const res = await send(path);
    expect(res.status).toBe(400);
    expect(seen.calls).toEqual([]);
  });

  it('forwards only projectId, never extra query params', async () => {
    const seen = trackUpstream();
    const res = await send('/conversations/c1/sendmessage?projectId=p1&admin=true&url=http://evil');
    expect(res.status).toBe(200);
    expect(seen.calls).toEqual([
      'http://assistant.internal.test/chat/conversations/c1/sendmessage?projectId=p1',
    ]);
  });

  it('accepts a dotted conversation name', async () => {
    const seen = trackUpstream();
    const res = await send('/conversations/conv.v1/sendmessage?projectId=p1');
    expect(res.status).toBe(200);
    expect(seen.calls).toEqual([
      'http://assistant.internal.test/chat/conversations/conv.v1/sendmessage?projectId=p1',
    ]);
  });
});
