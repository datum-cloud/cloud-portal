import { errorHandler } from './error-handler';
import { AuthenticationError, NotFoundError } from '@/utils/errors/app-error';
import { describe, expect, test } from 'bun:test';
import { Hono } from 'hono';

/**
 * A 401 reaches this handler by three different routes, and the caller cannot
 * tell them apart. The RFC 9728 challenge has to survive all of them — an
 * earlier version set it only for AppError, so a react-router ErrorResponse or
 * an un-normalized AxiosError answered 401 with no hint of where to
 * authenticate.
 */
function appThatThrows(error: unknown) {
  const app = new Hono();
  app.onError(errorHandler as never);
  app.get('/boom', () => {
    throw error;
  });
  return app;
}

/**
 * Shape react-router's `isRouteErrorResponse` recognises. It reaches Hono as a
 * wrapped Error rather than a bare object — Hono's onError only receives
 * Errors, so a plain object would fall through to the 500 branch instead.
 */
function routeErrorResponse(status: number) {
  return Object.assign(new Error('Unauthorized'), {
    status,
    statusText: 'Unauthorized',
    internal: false,
    data: null,
  });
}

/** An AxiosError-like object that never passed through the shared interceptors. */
function unnormalizedAxiosError(status: number) {
  return Object.assign(new Error('Request failed'), {
    isAxiosError: true,
    response: { status },
  });
}

const CHALLENGE =
  /^Bearer resource_metadata="https?:\/\/.+\/\.well-known\/oauth-protected-resource"$/;

describe('errorHandler auth challenge', () => {
  test('challenges a 401 raised as an AppError', async () => {
    const res = await appThatThrows(new AuthenticationError('nope')).request('/boom');

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toMatch(CHALLENGE);
  });

  test('challenges a 401 thrown as a react-router ErrorResponse', async () => {
    const res = await appThatThrows(routeErrorResponse(401)).request('/boom');

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toMatch(CHALLENGE);
  });

  test('challenges a 401 carried by an un-normalized upstream error', async () => {
    const res = await appThatThrows(unnormalizedAxiosError(401)).request('/boom');

    expect(res.status).toBe(401);
    expect(res.headers.get('WWW-Authenticate')).toMatch(CHALLENGE);
  });

  test('leaves other statuses unchallenged, so the header means only one thing', async () => {
    const res = await appThatThrows(new NotFoundError('missing')).request('/boom');

    expect(res.status).toBe(404);
    expect(res.headers.get('WWW-Authenticate')).toBeNull();
  });
});
