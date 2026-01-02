import { logger } from '@/modules/logger';
import type { Variables } from '@/server/types';
import { AppError, RateLimitError } from '@/utils/errors/app-error';
import * as Sentry from '@sentry/react-router';
import type { Context, ErrorHandler as HonoErrorHandler } from 'hono';

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

  // Unknown errors - capture to Sentry
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
