/// <reference types="bun-types/test" />
import { getRequestContext, oncePerRequest, withRequestContext } from './request-context';
import { LOGGER_CONFIG } from '@/modules/logger/logger.config';
import { requestContextMiddleware } from '@/server/middleware/request-context';
import type { Variables } from '@/server/types';
import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it, mock, spyOn } from 'bun:test';
import { type Handler, Hono } from 'hono';

// Pin Redis to null, as the auth.service suites do, so importing the auth
// module graph below neither connects nor logs.
mock.module('@/modules/redis', () => ({ redisClient: null }));
const { http } = await import('@/modules/axios/axios.server');
const { AuthService } = await import('@/utils/auth/auth.service');

const CTX = () => ({ requestId: 'r1', token: 't' });

/** Resolves on the next microtask turn, after a concurrent caller has started. */
const deferred = <T>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('oncePerRequest', () => {
  it('shares one in-flight call between concurrent callers', async () => {
    // The regression this exists for: React Router runs matched route loaders
    // concurrently, so a value cache written *after* an await is always missed
    // by the sibling loader it was meant to serve. Both callers here start
    // before the fetch resolves, which is exactly that shape.
    const gate = deferred<string>();
    const fetcher = mock(() => gate.promise);

    await withRequestContext(CTX(), async () => {
      const a = oncePerRequest('k', fetcher);
      const b = oncePerRequest('k', fetcher);

      gate.resolve('value');

      expect(await a).toBe('value');
      expect(await b).toBe('value');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  it('shares one call between sequential callers too', async () => {
    const fetcher = mock(async () => 'value');

    await withRequestContext(CTX(), async () => {
      expect(await oncePerRequest('k', fetcher)).toBe('value');
      expect(await oncePerRequest('k', fetcher)).toBe('value');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  it('keeps different keys apart', async () => {
    const fetcher = mock(async () => 'value');

    await withRequestContext(CTX(), async () => {
      await Promise.all([oncePerRequest('a', fetcher), oncePerRequest('b', fetcher)]);
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it('shares a rejection with callers already waiting', async () => {
    const boom = new Error('upstream down');
    const fetcher = mock(async () => {
      throw boom;
    });

    await withRequestContext(CTX(), async () => {
      const a = oncePerRequest('k', fetcher);
      const b = oncePerRequest('k', fetcher);

      expect(a).rejects.toBe(boom);
      expect(b).rejects.toBe(boom);
      await Promise.allSettled([a, b]);
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  it('does not replay a failure to a caller that arrives afterwards', async () => {
    // What the fail-open middlewares rely on: they swallow a failed pre-fetch
    // so the loader behind them can attempt it again and own the error. A
    // retained rejection would turn a transient blip into a hard page failure.
    const fetcher = mock(async () => {
      throw new Error('upstream down');
    });

    await withRequestContext(CTX(), async () => {
      await expect(oncePerRequest('k', fetcher)).rejects.toThrow('upstream down');
      await expect(oncePerRequest('k', fetcher)).rejects.toThrow('upstream down');
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it('does not carry a result into the next request', async () => {
    // The map hangs off the per-request store, so a failed read on one request
    // must not be handed to the next one.
    const fetcher = mock(async () => 'value');

    await withRequestContext(CTX(), () => oncePerRequest('k', fetcher));
    await withRequestContext({ requestId: 'r2', token: 't' }, () => oncePerRequest('k', fetcher));

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('does not retain a result that `retain` rejects', async () => {
    // For reads that report failure by RETURNING it rather than throwing.
    // `getUserWithAccessRetry` is the one that matters: an `{ error }` means
    // "could not determine", and a caller that reads it signs the user out.
    const results = ['fail', 'ok'];
    const fetcher = mock(async () => results.shift()!);
    const retain = (r: string) => r !== 'fail';

    await withRequestContext(CTX(), async () => {
      expect(await oncePerRequest('k', fetcher, { retain })).toBe('fail');
      expect(await oncePerRequest('k', fetcher, { retain })).toBe('ok');
      // ...and the good result is then retained.
      expect(await oncePerRequest('k', fetcher, { retain })).toBe('ok');
      expect(fetcher).toHaveBeenCalledTimes(2);
    });
  });

  it('still shares a non-retained result with callers already waiting', async () => {
    const gate = deferred<string>();
    const fetcher = mock(() => gate.promise);

    await withRequestContext(CTX(), async () => {
      const a = oncePerRequest('k', fetcher, { retain: () => false });
      const b = oncePerRequest('k', fetcher, { retain: () => false });

      gate.resolve('fail');

      expect(await a).toBe('fail');
      expect(await b).toBe('fail');
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
  });

  it('degrades to a plain call outside a request context', async () => {
    const fetcher = mock(async () => 'value');

    expect(getRequestContext()).toBeUndefined();
    expect(await oncePerRequest('k', fetcher)).toBe('value');
    expect(await oncePerRequest('k', fetcher)).toBe('value');
    // No store to memoise in — two calls, and nothing retained globally.
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('oncePerRequest > hardening', () => {
  it('does not emit an unhandled rejection when `retain` throws', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);

    try {
      const fetcher = mock(async () => 'value');
      const retain = () => {
        throw new Error('predicate blew up');
      };

      await withRequestContext(CTX(), async () => {
        expect(await oncePerRequest('k', fetcher, { retain })).toBe('value');
        // Treated as "do not retain", so the next caller re-fetches.
        expect(await oncePerRequest('k', fetcher, { retain })).toBe('value');
      });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(unhandled).toEqual([]);
      expect(fetcher).toHaveBeenCalledTimes(2);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });
});

describe('requestContextMiddleware', () => {
  const appWith = (handler: Handler<{ Variables: Variables }>) => {
    const app = new Hono<{ Variables: Variables }>();
    app.use('*', async (c, next) => {
      c.set('requestId', 'r');
      c.set('session', null);
      await next();
    });
    app.use('*', requestContextMiddleware());
    app.get('/', handler);
    return app;
  };

  it('stores the Cookie header and appends rotated cookies last', async () => {
    const app = appWith((c) => {
      const ctx = getRequestContext()!;
      expect(ctx.cookieHeader).toBe('a=1');
      ctx.rotatedCookies = new Headers([['Set-Cookie', 'session=new']]);
      return c.text('ok', 200, { 'Set-Cookie': 'session=old' });
    });

    const res = await app.request('/', { headers: { Cookie: 'a=1' } });

    expect(res.headers.getSetCookie()).toEqual(['session=old', 'session=new']);
    expect(await res.text()).toBe('ok');
  });

  it('appends rotated cookies to a response with immutable headers', async () => {
    const app = appWith(() => {
      getRequestContext()!.rotatedCookies = new Headers([['Set-Cookie', 'session=new']]);
      return Response.redirect('http://localhost/x');
    });

    const res = await app.request('/');

    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('http://localhost/x');
    expect(res.headers.getSetCookie()).toEqual(['session=new']);
  });

  it('leaves the response alone when nothing rotated', async () => {
    const app = appWith((c) => c.text('ok', 200, { 'Set-Cookie': 'session=old' }));

    const res = await app.request('/');

    expect(res.headers.getSetCookie()).toEqual(['session=old']);
  });
});

describe('axios 401 retry with a rotated session', () => {
  const ROTATED_CTX = () => ({ requestId: 'r1', token: 'old', cookieHeader: 'c=1' });
  const rotatedCookies = () => new Headers([['Set-Cookie', 'session=new']]);
  // Matched by shape: other suites re-mock modules the error class comes
  // through, so an instanceof check depends on file order.
  const TRANSFORMED_401 = { name: 'AuthenticationError', status: 401 };

  /** Rejects the first `failures` calls with a 401, then answers 200. */
  const adapterFailing = (failures: number) => {
    const tokens: string[] = [];
    const adapter = async (config: InternalAxiosRequestConfig): Promise<AxiosResponse> => {
      tokens.push(String(config.headers.get('Authorization')));
      if (tokens.length <= failures) {
        const response = { status: 401, statusText: 'Unauthorized', data: {}, headers: {}, config };
        throw new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, null, response);
      }
      return { status: 200, statusText: 'OK', data: { ok: true }, headers: {}, config };
    };
    return { adapter, tokens };
  };

  /** Stands in for the rotation lookup: redeems with `token` via the real `call`. */
  const redeemWith = (token: string) =>
    spyOn(AuthService, 'retryWithRotatedSession').mockImplementation((async (
      _cookieHeader: string | null,
      _usedToken: string,
      _site: string,
      call: (accessToken: string) => Promise<unknown>
    ) => ({ result: await call(token), headers: rotatedCookies() })) as never);

  // Keep the interceptor's API call logging out of the test output. Toggled
  // rather than spied: other suites replace the logger module wholesale.
  const logApiCalls = LOGGER_CONFIG.logApiCalls;
  beforeEach(() => {
    LOGGER_CONFIG.logApiCalls = false;
  });

  afterEach(() => {
    LOGGER_CONFIG.logApiCalls = logApiCalls;
    mock.restore();
  });

  it('retries a 401 once with the rotated token and returns the 200', async () => {
    const lookup = redeemWith('new');
    const { adapter, tokens } = adapterFailing(1);

    await withRequestContext(ROTATED_CTX(), async () => {
      const res = await http.get('/x', { adapter });
      const ctx = getRequestContext()!;

      expect(res.status).toBe(200);
      expect(res.data).toEqual({ ok: true });
      expect(tokens).toEqual(['Bearer old', 'Bearer new']);
      expect(ctx.token).toBe('new');
      expect(ctx.rotatedCookies?.getSetCookie()).toEqual(['session=new']);
    });
    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup.mock.calls[0].slice(0, 3)).toEqual(['c=1', 'old', 'axios']);
  });

  it('passes the transformed 401 through when there is no rotation', async () => {
    spyOn(AuthService, 'retryWithRotatedSession').mockResolvedValue(null);
    const { adapter, tokens } = adapterFailing(1);

    await withRequestContext(ROTATED_CTX(), async () => {
      await expect(http.get('/x', { adapter })).rejects.toMatchObject(TRANSFORMED_401);
      expect(getRequestContext()!.rotatedCookies).toBeUndefined();
    });
    expect(tokens).toEqual(['Bearer old']);
  });

  it('does not retry a retried request that 401s again', async () => {
    const lookup = redeemWith('new');
    const { adapter, tokens } = adapterFailing(2);

    await withRequestContext(ROTATED_CTX(), async () => {
      await expect(http.get('/x', { adapter })).rejects.toMatchObject(TRANSFORMED_401);
    });
    expect(tokens).toEqual(['Bearer old', 'Bearer new']);
    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('falls through to the normal 401 when the lookup throws', async () => {
    spyOn(AuthService, 'retryWithRotatedSession').mockRejectedValue(new Error('redis down'));
    const { adapter, tokens } = adapterFailing(1);

    await withRequestContext(ROTATED_CTX(), async () => {
      await expect(http.get('/x', { adapter })).rejects.toMatchObject(TRANSFORMED_401);
      expect(getRequestContext()!.token).toBe('old');
    });
    expect(tokens).toEqual(['Bearer old']);
  });
});
