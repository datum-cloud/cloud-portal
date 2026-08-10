import type { Variables } from '@/server/types';
import { NotFoundError, RateLimitError } from '@/utils/errors/app-error';
import { beforeEach, describe, expect, mock, test } from 'bun:test';
import { Hono } from 'hono';

const captureException = mock(() => 'sentry-event-id');
// Keep the mocked module faithful enough for transitive importers
// (mock.module is process-global in Bun and persists for the rest of the run).
mock.module('@sentry/react-router', () => ({
  captureException,
  captureMessage: mock(() => 'sentry-event-id'),
  addBreadcrumb: mock(() => {}),
  setTag: mock(() => {}),
  setContext: mock(() => {}),
  withScope: (callback: (scope: unknown) => void) =>
    callback({
      setTag: () => {},
      setExtra: () => {},
      setExtras: () => {},
      setLevel: () => {},
      setFingerprint: () => {},
      setContext: () => {},
    }),
}));

const loggerWarn = mock(() => {});
const loggerError = mock(() => {});
mock.module('@/modules/logger', () => ({
  logger: {
    warn: loggerWarn,
    error: loggerError,
    info: mock(() => {}),
    debug: mock(() => {}),
  },
}));

const { errorHandler } = await import('./error-handler');

/**
 * Real Hono app so tests exercise the actual Context/Response semantics —
 * notably that headers staged via c.header() only reach the Response when
 * set before c.json() creates it.
 */
async function requestWithError(error: Error): Promise<Response> {
  const app = new Hono<{ Variables: Variables }>();
  app.use('*', async (c, next) => {
    c.set('requestId', 'req-123');
    await next();
  });
  app.get('/api/proxy/test', () => {
    throw error;
  });
  app.onError(errorHandler);
  return app.request('/api/proxy/test');
}

const rawAxiosError = (status: number, upstreamMessage: string): Error =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    isAxiosError: true,
    response: { status, data: { kind: 'Status', message: upstreamMessage } },
  });

beforeEach(() => {
  captureException.mockClear();
  loggerWarn.mockClear();
  loggerError.mockClear();
});

describe('errorHandler', () => {
  test('raw AxiosError 403 → 403 sanitized body, no Sentry capture', async () => {
    const response = await requestWithError(rawAxiosError(403, 'upstream-internal-detail'));
    const body = (await response.json()) as Record<string, unknown>;

    expect(captureException).not.toHaveBeenCalled();
    expect(response.status).toBe(403);
    expect(body).toEqual({
      code: 'AUTHORIZATION_ERROR',
      message: 'Forbidden',
      status: 403,
      requestId: 'req-123',
    });
    expect(JSON.stringify(body)).not.toContain('upstream-internal-detail');
  });

  test('raw AxiosError 500 → captured with code + route tags, returned as 500', async () => {
    const response = await requestWithError(rawAxiosError(500, 'boom'));
    const body = (await response.json()) as Record<string, unknown>;

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({
          request_id: 'req-123',
          code: 'Error',
          route: '/api/proxy/test',
        }),
      })
    );
    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      code: 'INTERNAL_ERROR',
      status: 500,
      sentryEventId: 'sentry-event-id',
    });
  });

  test('plain Error → captured and returned as 500', async () => {
    const response = await requestWithError(new Error('unexpected boom'));
    const body = (await response.json()) as Record<string, unknown>;

    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        tags: expect.objectContaining({ code: 'Error', route: '/api/proxy/test' }),
      })
    );
    expect(response.status).toBe(500);
    expect(body).toMatchObject({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
      status: 500,
      requestId: 'req-123',
      sentryEventId: 'sentry-event-id',
    });
  });

  test('AppError 404 → 404 JSON envelope, no Sentry capture', async () => {
    const response = await requestWithError(new NotFoundError('Project', 'my-project'));
    const body = (await response.json()) as Record<string, unknown>;

    expect(captureException).not.toHaveBeenCalled();
    expect(response.status).toBe(404);
    expect(body).toMatchObject({
      code: 'NOT_FOUND',
      message: "Project 'my-project' not found",
      status: 404,
    });
  });

  test('RateLimitError → 429 with Retry-After header on the real Response, no Sentry capture', async () => {
    const response = await requestWithError(new RateLimitError(30));
    const body = (await response.json()) as Record<string, unknown>;

    expect(captureException).not.toHaveBeenCalled();
    expect(response.status).toBe(429);
    expect(body).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      status: 429,
    });
    expect(response.headers.get('Retry-After')).toBe('30');
  });
});
