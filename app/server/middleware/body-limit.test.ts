import { apiBodyLimit, JSON_BODY_LIMIT_BYTES, PROXY_BODY_LIMIT_BYTES } from './body-limit';
import type { Variables } from '@/server/types';
import { serve, type ServerType } from '@hono/node-server';
import { Hono } from 'hono';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

function appWithLimit() {
  const app = new Hono<{ Variables: Variables }>();
  app.use('/api/*', apiBodyLimit());
  app.post('/api/user', async (c) => c.json({ received: (await c.req.text()).length }));
  app.put('/api/proxy/*', async (c) => c.json({ received: (await c.req.text()).length }));
  return app;
}

const send = (method: string, path: string, size: number, chunked = false) => {
  const body = 'a'.repeat(size);
  return appWithLimit().request(path, {
    method,
    // A stream has no Content-Length, so the limit has to count bytes as they arrive.
    body: chunked
      ? new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(body));
            controller.close();
          },
        })
      : body,
    headers: chunked ? {} : { 'Content-Length': String(size) },
    // Node's fetch Request requires this for a streamed body.
    ...(chunked && { duplex: 'half' }),
  } as RequestInit);
};

describe('apiBodyLimit', () => {
  test('JSON routes accept exactly the limit and refuse one byte more', async () => {
    expect((await send('POST', '/api/user', JSON_BODY_LIMIT_BYTES)).status).toBe(200);

    const tooLarge = await send('POST', '/api/user', JSON_BODY_LIMIT_BYTES + 1);
    expect(tooLarge.status).toBe(413);
    expect(await tooLarge.json()).toEqual({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Request body too large',
      status: 413,
    });
  });

  test('the proxy takes bodies above the JSON limit up to its own', async () => {
    expect((await send('PUT', '/api/proxy/apis/x', JSON_BODY_LIMIT_BYTES + 1)).status).toBe(200);
    expect((await send('PUT', '/api/proxy/apis/x', PROXY_BODY_LIMIT_BYTES)).status).toBe(200);
    expect((await send('PUT', '/api/proxy/apis/x', PROXY_BODY_LIMIT_BYTES + 1)).status).toBe(413);
  });

  test('chunked bodies without Content-Length are counted too', async () => {
    expect((await send('POST', '/api/user', JSON_BODY_LIMIT_BYTES, true)).status).toBe(200);
    expect((await send('POST', '/api/user', JSON_BODY_LIMIT_BYTES + 1, true)).status).toBe(413);
  });
});

// app.request() hands the middleware a native Request. The real server hands it
// @hono/node-server's lightweight one, with the global Request left native as
// react-router-hono-server's Node adapter leaves it.
describe('apiBodyLimit behind the Node server', () => {
  let server: ServerType;
  let origin: string;

  beforeAll(async () => {
    const app = appWithLimit();
    app.delete('/api/proxy/*', async (c) => c.json({ received: (await c.req.text()).length }));
    server = serve({ fetch: app.fetch, port: 0, overrideGlobalObjects: false });
    await once(server, 'listening');
    origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
  });

  test('a DELETE without a body reaches the route', async () => {
    const res = await fetch(`${origin}/api/proxy/apis/x`, { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ received: 0 });
  });

  test('a chunked body is counted and forwarded intact', async () => {
    const chunked = (size: number) =>
      fetch(`${origin}/api/user`, {
        method: 'POST',
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('a'.repeat(size)));
            controller.close();
          },
        }),
        duplex: 'half',
      } as RequestInit);

    const ok = await chunked(JSON_BODY_LIMIT_BYTES);
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ received: JSON_BODY_LIMIT_BYTES });
    expect((await chunked(JSON_BODY_LIMIT_BYTES + 1)).status).toBe(413);
  });
});
