import type { Organization } from '@/resources/organizations';
import type { Project } from '@/resources/projects';
import type { User } from '@/resources/users';
import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request context for server-side axios/gqlts calls.
 * Provides token and requestId without prop drilling.
 * Uses globalThis to share context between axios and gqlts modules.
 */
export interface RequestContext {
  requestId: string;
  token: string;
  userId?: string;
  /** Original browser User-Agent for upstream audit logs (SSR fetch/graphql). */
  userAgent?: string;
  /**
   * Per-request user cache. Written by authMiddleware / fraudStatusMiddleware
   * after fetching the user; read by downstream loaders to avoid duplicate calls.
   */
  cachedUser?: User;
  /**
   * Whether the signed-in user belongs to at least one organization. Written by
   * authMiddleware's no-orgs onboarding guard, which already probes this with a
   * `list({ limit: 1 })`; read by routes that repeat the same guard for
   * client-side navigations that bypass the middleware.
   *
   * Deliberately a boolean, not the list: it is derived from a `limit: 1`
   * response, so it answers "any orgs?" and nothing else. Anything needing the
   * user's actual organizations must fetch them.
   */
  hasOrganizations?: boolean;
  /**
   * Per-request project cache. Written by projectLegacySetupMiddleware, which
   * fetches the project only to resolve its owning org; read by the project
   * detail layout loader, which would otherwise repeat the identical call a
   * moment later. See `getProjectForRequest`
   * (app/resources/projects/project-request-cache.server.ts).
   */
  cachedProject?: Project;
  /**
   * Per-request organization cache. Same arrangement as `cachedProject`, between
   * the org setup pre-check and the org detail layout loader. See
   * `getOrganizationForRequest`
   * (app/resources/organizations/organization-request-cache.server.ts).
   */
  cachedOrganization?: Organization;
  /**
   * In-flight upstream reads, keyed by {@link requestCacheKeys}. Backs
   * {@link oncePerRequest}. Holds promises rather than values, which is the
   * whole point — see that function.
   */
  inFlight?: Map<string, Promise<unknown>>;
}

// Use globalThis to share the store across modules (axios, gqlts, etc.)
const STORE_KEY = '__request_context_store__';

function getStore(): AsyncLocalStorage<RequestContext> {
  if (!(globalThis as any)[STORE_KEY]) {
    (globalThis as any)[STORE_KEY] = new AsyncLocalStorage<RequestContext>();
  }
  return (globalThis as any)[STORE_KEY];
}

/**
 * Get current request context from AsyncLocalStorage.
 * Returns undefined if called outside of withRequestContext.
 */
export function getRequestContext(): RequestContext | undefined {
  return getStore().getStore();
}

/**
 * Run code with request context.
 * Token and requestId will be auto-injected to axios/gqlts calls.
 */
export function withRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return getStore().run(ctx, fn);
}

/**
 * Run `fn` at most once per request, sharing the result with every other caller
 * that asks for the same `key` during that request.
 *
 * The value caches above (`cachedUser`, `cachedProject`, …) only dedupe callers
 * that run *after* the writer has finished awaiting. React Router runs every
 * matched route's loader concurrently, and `withMiddleware` wraps one loader,
 * not the request — so a route loader typically starts at the same instant as
 * the middleware that was supposed to fill the cache for it, reads `undefined`,
 * and fetches the same record a second time. Registering the promise
 * synchronously, before anything awaits it, is what closes that window.
 *
 * A FAILURE is shared with callers already waiting — they had issued the same
 * call — but is never retained. A caller arriving afterwards gets a fresh
 * attempt, which is what the fail-open middlewares depend on: they swallow a
 * failed pre-fetch precisely so the loader behind them can try again and own
 * the error. That covers a rejection automatically, and a read that reports
 * failure in its return value via `retain`. The map dies with the request
 * either way.
 *
 * Outside a request context (no AsyncLocalStorage store) this degrades to a
 * plain call.
 */
export function oncePerRequest<T>(
  key: string,
  fn: () => Promise<T>,
  options?: {
    /**
     * Whether a resolved result may be served to LATER callers on this request.
     * Defaults to always. Pass it for a read that reports failure by returning
     * a value rather than throwing — `getUserWithAccessRetry` returns
     * `{ error }` — so that a failure is not retained any more than a rejection
     * is. Callers already waiting still receive it: they had issued the same
     * call.
     */
    retain?: (result: T) => boolean;
  }
): Promise<T> {
  const ctx = getRequestContext();
  if (!ctx) {
    return fn();
  }

  const inFlight = (ctx.inFlight ??= new Map<string, Promise<unknown>>());
  const existing = inFlight.get(key) as Promise<T> | undefined;
  if (existing) {
    return existing;
  }

  // Must be set before the caller gets a chance to await, or a concurrent
  // caller still misses.
  const promise = fn();
  inFlight.set(key, promise);

  // The guard keeps this from evicting a newer attempt under the same key.
  const forget = () => {
    if (inFlight.get(key) === promise) {
      inFlight.delete(key);
    }
  };
  // Eviction has to happen in THIS callback, not a `.catch` chained after it.
  // Callbacks run in registration order, and this one is registered before the
  // caller awaits — so it evicts before the caller resumes and asks again. Move
  // it one link down the chain and the next caller reads a stale entry.
  //
  // `retain` is called inside the try for the same reason the chain is flat: a
  // predicate that threw would reject a derived promise nobody holds, which is
  // a process-level unhandled rejection. A throw means "do not retain".
  void promise.then((result) => {
    let keep: boolean;
    try {
      keep = !options?.retain || options.retain(result);
    } catch {
      keep = false;
    }
    if (!keep) forget();
  }, forget);

  return promise;
}
