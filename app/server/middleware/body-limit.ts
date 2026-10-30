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
 * Caps request bodies under /api with 413. Bun's own ceiling is 128 MiB, and
 * the routes here buffer the body before forwarding it. A request with a
 * Content-Length is refused before any byte is read; a chunked body is
 * counted as it streams.
 */
export function apiBodyLimit(): MiddlewareHandler<{ Variables: Variables }> {
  const json = bodyLimit({ maxSize: JSON_BODY_LIMIT_BYTES, onError: payloadTooLarge });
  const proxy = bodyLimit({ maxSize: PROXY_BODY_LIMIT_BYTES, onError: payloadTooLarge });
  return (c, next) => (c.req.path.startsWith(PROXY_PREFIX) ? proxy : json)(c, next);
}
