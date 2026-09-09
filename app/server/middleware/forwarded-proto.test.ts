import { forwardedProtoMiddleware } from './forwarded-proto';
import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';

/**
 * Mirrors react-router-hono-server: the request handler is invoked with
 * `c.req.raw`, so that is what the echo route reports. `same` tells whether
 * the middleware left the original Request object in place.
 */
function appEchoingRawRequest() {
  const app = new Hono();
  let before: Request | undefined;
  app.use('*', async (c, next) => {
    before = c.req.raw;
    await next();
  });
  app.use('*', forwardedProtoMiddleware());
  app.all('/echo', async (c) => {
    const raw = c.req.raw;
    return c.json({
      url: raw.url,
      honoUrl: c.req.url,
      method: raw.method,
      origin: raw.headers.get('origin'),
      cookie: raw.headers.get('cookie'),
      body: raw.method === 'POST' ? await raw.text() : null,
      same: raw === before,
    });
  });
  return app;
}

describe('forwardedProtoMiddleware', () => {
  it('rewrites an http URL to https when X-Forwarded-Proto is https, keeping method, headers and body', async () => {
    const app = appEchoingRawRequest();

    const res = await app.request('http://localhost:3100/echo', {
      method: 'POST',
      headers: {
        'X-Forwarded-Proto': 'https',
        Origin: 'https://localhost:3100',
        Cookie: 'session=abc',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'projectId=x&orgId=y',
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: 'https://localhost:3100/echo',
      honoUrl: 'https://localhost:3100/echo',
      method: 'POST',
      origin: 'https://localhost:3100',
      cookie: 'session=abc',
      body: 'projectId=x&orgId=y',
      same: false,
    });
  });

  it('leaves the request untouched without X-Forwarded-Proto', async () => {
    const app = appEchoingRawRequest();

    const res = await app.request('http://localhost:3100/echo');

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      url: 'http://localhost:3100/echo',
      honoUrl: 'http://localhost:3100/echo',
      same: true,
    });
  });

  it('leaves the request untouched when X-Forwarded-Proto is http or any other value', async () => {
    const app = appEchoingRawRequest();

    for (const proto of ['http', 'HTTPS', 'https,http', 'wss', '']) {
      const res = await app.request('http://localhost:3100/echo', {
        headers: { 'X-Forwarded-Proto': proto },
      });

      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({
        url: 'http://localhost:3100/echo',
        same: true,
      });
    }
  });

  it('leaves an already-https request untouched even with the header', async () => {
    const app = appEchoingRawRequest();

    const res = await app.request('https://localhost:3100/echo', {
      headers: { 'X-Forwarded-Proto': 'https' },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({
      url: 'https://localhost:3100/echo',
      same: true,
    });
  });
});
