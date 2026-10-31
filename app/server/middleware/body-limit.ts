import type { Variables } from '@/server/types';
import type { Context, MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';

const MiB = 1024 * 1024;

/**
 * JSON routes (GraphQL, user, permissions, assistant chat, Prometheus) carry
 * forms, queries and single chat messages, all far below this.
 */
export const JSON_BODY_LIMIT_BYTES = 1 * MiB;

/**
 * The K8s passthrough carries whole resource manifests. Milo, like any
 * kube-apiserver, refuses request bodies over 3 MiB, so a bigger body could
 * only fail later. The largest upload in the UI, a DNS zone file import, is
 * capped at 1 MiB client-side and sent one record set per request.
 */
export const PROXY_BODY_LIMIT_BYTES = 3 * MiB;

const PROXY_PREFIX = '/api/proxy/';

function payloadTooLarge(c: Context) {
  return c.json({ code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large', status: 413 }, 413);
}

/**
 * Whether hono's bodyLimit will count the body as it streams, and then rebuild
 * the request around what it read. A bodiless DELETE lands here too: the Node
 * server gives every request but GET and HEAD a body stream, empty or not.
 */
function countsBody(raw: Request): boolean {
  return (
    raw.body !== null &&
    (!raw.headers.has('content-length') || raw.headers.has('transfer-encoding'))
  );
}

/**
 * bodyLimit rebuilds with `new Request(c.req.raw, init)`. The Node adapter
 * leaves the global Request native, and Node's Request takes @hono/node-server's
 * lightweight request for a URL string, failing with "Failed to parse URL from
 * [object Request]". A native copy built from the URL is accepted.
 */
function toNativeRequest(raw: Request): Request {
  return new Request(raw.url, {
    method: raw.method,
    headers: raw.headers,
    body: raw.body,
    duplex: 'half',
    signal: raw.signal,
  } as RequestInit);
}

/**
 * Caps request bodies under /api with 413. Node's HTTP server sets no body
 * ceiling of its own, and the routes here buffer the body before forwarding
 * it. A request with a Content-Length is refused before any byte is read; a
 * chunked body is counted as it streams.
 */
export function apiBodyLimit(): MiddlewareHandler<{ Variables: Variables }> {
  const json = bodyLimit({ maxSize: JSON_BODY_LIMIT_BYTES, onError: payloadTooLarge });
  const proxy = bodyLimit({ maxSize: PROXY_BODY_LIMIT_BYTES, onError: payloadTooLarge });
  return (c, next) => {
    if (countsBody(c.req.raw)) c.req.raw = toNativeRequest(c.req.raw);
    return (c.req.path.startsWith(PROXY_PREFIX) ? proxy : json)(c, next);
  };
}
