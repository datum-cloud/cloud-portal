import { logger } from '@/modules/logger';
import { isExpectedUserError, resolveErrorCode } from '@/modules/sentry';
import type { Variables } from '@/server/types';
import { AppError, RateLimitError } from '@/utils/errors/app-error';
import * as Sentry from '@sentry/react-router';
import type { Context, ErrorHandler as HonoErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { isRouteErrorResponse } from 'react-router';

/**
 * Generic bodies for expected user-facing statuses. Raw errors reaching the
 * backstop (e.g. AxiosError from clients outside the shared interceptors) may
 * carry upstream internals in their message — never echo those to the client.
 */
const EXPECTED_STATUS_RESPONSES: Record<number, { code: string; message: string }> = {
  401: { code: 'AUTHENTICATION_ERROR', message: 'Unauthorized' },
  403: { code: 'AUTHORIZATION_ERROR', message: 'Forbidden' },
  404: { code: 'NOT_FOUND', message: 'Not Found' },
  429: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too Many Requests' },
};

function resolveErrorStatus(error: unknown): number | undefined {
  const candidate = error as { status?: unknown; response?: { status?: unknown } };
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.response?.status === 'number') return candidate.response.status;
  return undefined;
}

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
 *
 * Any other error carrying an expected user-facing status (401/403/404/429),
 * such as a raw AxiosError, is likewise answered with its real status and a
 * sanitized body instead of being captured as a 500 — reaching that branch
 * means an upstream capture site failed to normalize the error into an
 * AppError.
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

    // Headers must be staged before c.json(): Hono snapshots prepared
    // headers into the Response at creation time, so a later c.header()
    // call never reaches the already-created Response.
    if (error instanceof RateLimitError && error.retryAfter) {
      c.header('Retry-After', String(error.retryAfter));
    }

    return c.json(error.toJSON(), error.status as ContentfulStatusCode);
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

  if (isExpectedUserError(error)) {
    const status = (resolveErrorStatus(error) ?? 500) as ContentfulStatusCode;
    const body = EXPECTED_STATUS_RESPONSES[status] ?? {
      code: 'REQUEST_FAILED',
      message: 'Request could not be handled',
    };

    logger.warn(`Expected ${status} reached error handler unnormalized: ${error.message}`, {
      requestId,
      path: c.req.path,
      method: c.req.method,
    });

    return c.json({ code: body.code, message: body.message, status, requestId }, status);
  }

  const eventId = Sentry.captureException(error, {
    tags: {
      request_id: requestId,
      code: resolveErrorCode(error),
      route: c.req.path,
    },
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
