/// <reference types="bun-types/test" />
import { getRequestContext, oncePerRequest, withRequestContext } from './request-context';
import { describe, expect, it, mock } from 'bun:test';

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
