import { buildScopedPath, buildProxyPath } from './endpoints';
import type { GqlScope } from './types';
import { env } from '@/utils/env';
import { createClient, cacheExchange, fetchExchange } from '@urql/core';
import type { Client as UrqlClient, SSRExchange } from '@urql/core';

// Set by request-context middleware (same key as app/modules/axios/request-context.ts)
const REQUEST_CONTEXT_KEY = '__request_context_store__';

function getRequestContext() {
  if (typeof window !== 'undefined') return undefined;
  try {
    const store = (globalThis as any)[REQUEST_CONTEXT_KEY];
    if (store && typeof store.getStore === 'function') {
      return store.getStore();
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Wraps native fetch with Authorization and X-Request-ID headers
 * sourced from AsyncLocalStorage (same data as the axios.server interceptor).
 */
function buildAuthFetch(token?: string, requestId?: string, userAgent?: string): typeof fetch {
  return (input, init = {}) =>
    fetch(input, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(requestId ? { 'X-Request-ID': requestId } : {}),
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
      },
    });
}

/**
 * Creates a URQL client scoped to the given GqlScope.
 *
 * - Server: direct to GRAPHQL_URL with auth from AsyncLocalStorage
 * - Client: through /api/graphql proxy (session cookie auth, handled by Hono)
 *
 * Pass an ssrExchange instance to participate in SSR→CSR cache hydration.
 *
 * Same public API as the previous gqlts-backed createGqlClient.
 */
export function createGqlClient(scope: GqlScope, ssr?: SSRExchange): UrqlClient {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const ctx = getRequestContext();

    // Resolve 'me' to actual userId from AsyncLocalStorage context
    let resolvedScope = scope;
    if (scope.type === 'user' && scope.userId === 'me' && ctx?.userId) {
      resolvedScope = { type: 'user', userId: ctx.userId };
    }

    const url = `${env.public.graphqlUrl}${buildScopedPath(resolvedScope)}`;

    return createClient({
      url,
      preferGetMethod: false, // @urql/core@6 defaults to GET; backend requires POST
      exchanges: [cacheExchange, ...(ssr ? [ssr] : []), fetchExchange],
      fetch: buildAuthFetch(ctx?.token, ctx?.requestId, ctx?.userAgent),
    });
  }

  // Client-side: Hono proxy at /api/graphql handles auth via session cookie
  return createClient({
    url: buildProxyPath(scope),
    preferGetMethod: false, // @urql/core@6 defaults to GET; backend requires POST
    exchanges: [cacheExchange, ...(ssr ? [ssr] : []), fetchExchange],
  });
}

export type { GqlScope } from './types';
