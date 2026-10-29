/// <reference types="bun-types/test" />
import { apiBodyLimit, JSON_BODY_LIMIT_BYTES, PROXY_BODY_LIMIT_BYTES } from './body-limit';
import type { Variables } from '@/server/types';
import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';

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
  });
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
