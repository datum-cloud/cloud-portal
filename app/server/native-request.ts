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
