/**
 * Sentry Tracing
 *
 * HTTP request tracing middleware for Hono.
 */
import type { Variables } from '@/server/types';
import * as Sentry from '@sentry/react-router';
import { createMiddleware } from 'hono/factory';

/**
 * Creates Sentry tracing middleware for Hono.
 * Wraps each request in a span with HTTP method, URL, and status code.
 */
export function sentryTracingMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;

    return Sentry.startSpan(
      {
        name: `${method} ${path}`,
        op: 'http.server',
        attributes: {
          'http.method': method,
          'http.url': c.req.url,
          'http.route': path,
        },
      },
      async (span) => {
        await next();

        if (span) {
          span.setAttribute('http.status_code', c.res.status);
        }
      }
    );
  });
}
