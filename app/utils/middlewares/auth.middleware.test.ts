/// <reference types="bun-types/test" />
import { authMiddleware, type AuthMiddlewareDeps } from './auth.middleware';
import type { MiddlewareContext } from './middleware';
import {
  getRequestContext,
  oncePerRequest,
  withRequestContext,
} from '@/modules/axios/request-context';
import { sessionContext } from '@/server/context';
import { loadUserOncePerRequest } from '@/utils/fraud/user-access';
import { requestCacheKeys } from '@/utils/request-cache-keys';
import { beforeEach, describe, expect, it, mock } from 'bun:test';

// Upstream reads are injected via the middleware's `deps` seam rather than
// mock.module'd — that registry is process-global in bun and would hand these
// stubs to every later suite.
const loadUser = mock(async () => ({ user: { sub: 'u1', email: 'u@example.test' } }) as never);
const listOrganizations = mock(async () => ({ items: [{ name: 'acme' }] }));

const deps = (): AuthMiddlewareDeps => ({ loadUser, listOrganizations });

const NEXT = new Response('next', { status: 200 });
const next = mock(async () => NEXT);

/** A ctx whose load context already carries a validated session (the fast path). */
function ctx(url: string, sub: string | undefined = 'u1'): MiddlewareContext {
  return {
    request: new Request(url),
    context: { get: (key: unknown) => (key === sessionContext ? { sub } : undefined) },
  } as unknown as MiddlewareContext;
}

beforeEach(() => {
  loadUser.mockClear();
  listOrganizations.mockClear();
  listOrganizations.mockImplementation(async () => ({ items: [{ name: 'acme' }] }));
  next.mockClear();
});

describe('authMiddleware > per-request caching', () => {
  it('caches the user and the has-organizations verdict for downstream loaders', async () => {
    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const res = await authMiddleware(ctx('http://localhost/account/organizations'), next, deps());

      expect(res).toBe(NEXT);
      expect(getRequestContext()?.cachedUser).toMatchObject({ sub: 'u1' });
      expect(getRequestContext()?.hasOrganizations).toBe(true);
      expect(loadUser).toHaveBeenCalledTimes(1);
      expect(listOrganizations).toHaveBeenCalledTimes(1);
    });
  });

  it('caches a false verdict, so a downstream `??` read does not re-probe', async () => {
    // The trap this guards: `cached || fetch()` would treat a genuine "no orgs"
    // as a cache miss and fetch again. Consumers must use `??`.
    listOrganizations.mockImplementation(async () => ({ items: [] }));

    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      // No orgs → the middleware redirects into onboarding rather than calling next().
      const res = await authMiddleware(ctx('http://localhost/account/organizations'), next, deps());

      expect(res.status).toBe(302);
      expect(getRequestContext()?.hasOrganizations).toBe(false);
    });
  });

  it('skips the probe entirely on exempt paths, leaving the cache empty', async () => {
    // Account settings are reachable without an org, so the guard never runs —
    // and downstream readers must therefore still handle a cache miss.
    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const res = await authMiddleware(ctx('http://localhost/account/general'), next, deps());

      expect(res).toBe(NEXT);
      expect(loadUser).not.toHaveBeenCalled();
      expect(getRequestContext()?.hasOrganizations).toBeUndefined();
      expect(getRequestContext()?.cachedUser).toBeUndefined();
    });
  });

  it('degrades to a plain pass-through outside a request context', async () => {
    const res = await authMiddleware(ctx('http://localhost/account/organizations'), next, deps());

    expect(res).toBe(NEXT);
    expect(getRequestContext()).toBeUndefined();
  });
});

describe('authMiddleware > concurrent readers', () => {
  it('shares its upstream reads with a loader that starts at the same time', async () => {
    // The shape that made the value caches useless here: this middleware wraps
    // the private layout's loader, but React Router starts every matched
    // route's loader concurrently — so `/account/organizations`'s own loader is
    // already running by the time `cachedUser` / `hasOrganizations` get written,
    // and fetched the identical pair. Joining the same `oncePerRequest` keys is
    // what collapses them. A regression here shows up as a doubled
    // UserService.get and a doubled `list({ limit: 1 })` per request.
    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const middleware = authMiddleware(
        ctx('http://localhost/account/organizations'),
        next,
        deps()
      );

      // Not awaited first: the point is that this runs before the middleware
      // has written anything back to the context.
      const loader = Promise.all([
        oncePerRequest(requestCacheKeys.userAccess('u1'), loadUser),
        oncePerRequest(requestCacheKeys.anyOrganizations, listOrganizations),
      ]);

      await Promise.all([middleware, loader]);

      expect(loadUser).toHaveBeenCalledTimes(1);
      expect(listOrganizations).toHaveBeenCalledTimes(1);
    });
  });
});

describe('authMiddleware > indeterminate user reads', () => {
  it('does not hand an indeterminate result to a loader that runs afterwards', async () => {
    // `{ error: 'other' }` is a Milo 5xx / timeout / reset — "could not
    // determine", not "no such user". The middleware fails open on it, but
    // `/account/organizations` reads the same value and signs the user out. If
    // that were shared, one upstream blip would log people out instead of
    // costing them a retry. This is the guard for that.
    loadUser.mockImplementation(async () => ({ error: 'other' }) as never);

    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      const res = await authMiddleware(ctx('http://localhost/account/organizations'), next, deps());

      // Email gate off → fail open, request proceeds.
      expect(res).toBe(NEXT);

      // The route loader, arriving after the middleware, gets its own attempt.
      loadUser.mockImplementation(
        async () => ({ user: { sub: 'u1', email: 'u@example.test' } }) as never
      );
      const access = await loadUserOncePerRequest('u1', null, loadUser);

      expect(access).toMatchObject({ user: { sub: 'u1' } });
      expect(loadUser).toHaveBeenCalledTimes(2);
    });
  });

  it('still shares a successful read', async () => {
    await withRequestContext({ requestId: 'r1', token: 't' }, async () => {
      await authMiddleware(ctx('http://localhost/account/organizations'), next, deps());
      await loadUserOncePerRequest('u1', null, loadUser);

      expect(loadUser).toHaveBeenCalledTimes(1);
    });
  });
});
