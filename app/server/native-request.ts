import { createMiddleware } from 'hono/factory';

/**
 * Copies a request into a native Request, optionally at a new URL.
 *
 * Behind the Node server, `c.req.raw` is @hono/node-server's lightweight
 * request with the global Request left native. Node's Request constructor
 * cannot take it whole: as the input it reads it as a URL string ("Failed to
 * parse URL from [object Request]"), and as the init it calls native getters
 * on it, which throws "Illegal invocation" from Node 26. Building from plain
 * fields avoids both.
 */
export function toNativeRequest(raw: Request, url: string = raw.url): Request {
  return new Request(url, {
    method: raw.method,
    headers: raw.headers,
    body: raw.body,
    duplex: 'half',
    signal: raw.signal,
  } as RequestInit);
}

/**
 * Hands every request to the app as a native Request.
 *
 * Behind the gateway, forwardedProtoMiddleware already rebuilds each request
 * (it always carries `X-Forwarded-Proto: https`). Without the gateway (local
 * dev, E2E) nothing did, so the lightweight request reached React Router and
 * anything that copied it threw "Illegal invocation" on Node 26, starting with
 * remix-auth's `new Request(request)` in the sign-in callback.
 */
export function nativeRequestMiddleware() {
  return createMiddleware(async (c, next) => {
    if (Object.getPrototypeOf(c.req.raw) !== Request.prototype) {
      c.req.raw = toNativeRequest(c.req.raw);
    }
    await next();
  });
}
