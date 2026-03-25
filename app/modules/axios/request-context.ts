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
   * Per-request user cache. Written by fraudStatusMiddleware after
   * fetching the user for the fraud evaluation check; read by the private layout loader
   * to avoid a second upstream API call on the same request.
   */
  cachedUser?: User;
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
