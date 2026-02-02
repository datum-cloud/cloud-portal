// app/modules/gqlts/client.ts
// Universal gqlts client - works in both browser and server
// Uses axios instances registered on globalThis by axios modules
import { buildProxyPath, buildScopedPath } from './endpoints';
import { createClient as createGqltsClient } from './generated';
import type { GqlScope } from './types';

// Keys used by axios modules to register instances on globalThis
const SERVER_HTTP_KEY = '__axios_server_http__';
const CLIENT_HTTP_KEY = '__axios_client_http__';
const REQUEST_CONTEXT_KEY = '__request_context_store__';

/**
 * Gets request context from globalThis (set by axios middleware).
 */
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
 * Creates a Gqlts client that works in both browser and server.
 *
 * - Browser: Uses httpClient from axios.client (proxy URL, session cookies, Sentry)
 * - Server: Uses http from axios.server (direct API, auth injection, curl logging)
 *
 * Falls back to default gqlts behavior if axios instances are not available.
 */
export function createGqlClient(scope: GqlScope) {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const ctx = getRequestContext();

    // Resolve 'me' to actual userId from context
    let resolvedScope = scope;
    if (scope.type === 'user' && scope.userId === 'me' && ctx?.userId) {
      resolvedScope = { type: 'user', userId: ctx.userId };
    }

    // Get graphqlUrl from env (server-side only)
    const graphqlUrl = process.env.GRAPHQL_URL || 'http://localhost:8080';
    const path = buildScopedPath(resolvedScope);
    const url = `${graphqlUrl}${path}`;

    // Use axios instance from globalThis if available
    const http = (globalThis as any)[SERVER_HTTP_KEY];

    return createGqltsClient({
      url,
      fetcherInstance: http,
    });
  }

  // Client-side: Use proxy URL with httpClient
  const path = buildProxyPath(scope);

  // Use axios instance from globalThis if available
  const httpClient = (globalThis as any)[CLIENT_HTTP_KEY];

  return createGqltsClient({
    url: path,
    // Override httpClient's baseURL since GraphQL proxy is at '/api/graphql',
    // not under '/api/proxy'
    baseURL: '',
    fetcherInstance: httpClient,
  });
}

export type { GqlScope } from './types';
