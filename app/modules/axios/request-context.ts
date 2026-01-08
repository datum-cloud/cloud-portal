import { AsyncLocalStorage } from 'async_hooks';

/**
 * Request context for server-side axios calls.
 * Provides token and requestId without prop drilling.
 */
export interface RequestContext {
  requestId: string;
  token: string;
  userId?: string;
}

const requestContext = new AsyncLocalStorage<RequestContext>();

/**
 * Get current request context from AsyncLocalStorage.
 * Returns undefined if called outside of withRequestContext.
 */
export function getRequestContext(): RequestContext | undefined {
  return requestContext.getStore();
}

/**
 * Run code with request context.
 * Token and requestId will be auto-injected to axios calls.
 */
export function withRequestContext<T>(ctx: RequestContext, fn: () => T): T {
  return requestContext.run(ctx, fn);
}
