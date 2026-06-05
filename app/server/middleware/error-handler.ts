import { logger } from '@/modules/logger';
import type { Variables } from '@/server/types';
import { AppError, RateLimitError } from '@/utils/errors/app-error';
import * as Sentry from '@sentry/react-router';
import type { Context, ErrorHandler as HonoErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { isRouteErrorResponse } from 'react-router';

/**
 * React Router throws an `ErrorResponse` (wrapped Error) when a request
 * is structurally unservable — e.g. a POST to a route without an `action`,
 * a path that matches no routes, etc. These bubble out of the SSR
 * handler into Hono. They are client errors, not bugs, so we surface
 * the correct HTTP status and skip the Sentry capture path.
 *
 * Common sources in production: bot/scanner traffic (`POST //`,
 * `PUT /wp-login.php`), stale browser submissions, and bookmarked
 * deleted resources.
 */
export const errorHandler: HonoErrorHandler<{ Variables: Variables }> = (
  error: Error,
  c: Context<{ Variables: Variables }>
) => {
  const requestId = c.get('requestId') ?? c.req.header('X-Request-ID');

  if (error instanceof AppError) {
    if (error.status >= 500) {
      logger.error(`[${error.code}] ${error.message}`, error, { requestId });
    }

    const response = c.json(error.toJSON(), error.status as 400);

    if (error instanceof RateLimitError && error.retryAfter) {
      c.header('Retry-After', String(error.retryAfter));
    }

    return response;
  }

  if (isRouteErrorResponse(error)) {
    const status = error.status as ContentfulStatusCode;
    logger.warn(`React Router ${status}: ${error.statusText}`, {
      requestId,
      path: c.req.path,
      method: c.req.method,
      data: typeof error.data === 'string' ? error.data : undefined,
    });

    return c.json(
      {
        code: 'ROUTER_ERROR',
        message: error.statusText || 'Request could not be handled',
        status,
        requestId,
      },
      status
    );
  }

  const eventId = Sentry.captureException(error, {
    tags: { request_id: requestId },
    extra: {
      path: c.req.path,
      method: c.req.method,
    },
  });

  logger.error(`Unhandled error: ${error.message}`, error, { requestId });

  return c.json(
    {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      status: 500,
      requestId,
      sentryEventId: eventId,
    },
    500
  );
};
