import { nativeRequestMiddleware } from './native-request';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';

class LightweightRequest extends Request {}

function appSeeingRequest() {
  const app = new Hono();
  app.use('*', nativeRequestMiddleware());
  app.get('*', (c) =>
    c.json({
      native: Object.getPrototypeOf(c.req.raw) === Request.prototype,
      url: c.req.url,
      cookie: c.req.header('cookie'),
    })
  );
  return app;
}

describe('nativeRequestMiddleware', () => {
  it('swaps a non-native request for a native copy', async () => {
    const res = await appSeeingRequest().fetch(
      new LightweightRequest('http://localhost:3000/auth/callback?code=1', {
        headers: { cookie: '_session=a' },
      })
    );
    expect(await res.json()).toEqual({
      native: true,
      url: 'http://localhost:3000/auth/callback?code=1',
      cookie: '_session=a',
    });
  });

  it('leaves a native request alone', async () => {
    const res = await appSeeingRequest().fetch(new Request('http://localhost:3000/'));
    expect((await res.json()).native).toBe(true);
  });
});
