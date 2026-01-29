// app/modules/gqlts/client.ts
// Universal gqlts client - routes to server or client implementation based on environment
import { buildProxyPath, buildScopedPath } from './endpoints';
import { createClient as createGqltsClient } from './generated';
import { getRequestContext } from './request-context';
import type { GqlScope } from './types';

/**
 * Creates a Gqlts client that works in both browser and server.
 *
 * - Browser: Uses proxy URL (auth via session cookies)
 * - Server: Uses direct API with auth from request context
 *
 * For server-only code with full logging, import from './client.server' instead.
 */
export function createGqlClient(scope: GqlScope) {
  const isServer = typeof window === 'undefined';

  if (isServer) {
    const ctx = getRequestContext();

    if (ctx?.token) {
      // Server with auth context: Direct API access
      const graphqlUrl = process.env.GRAPHQL_URL || 'http://localhost:8080';

      // Resolve 'me' to actual userId from context
      let resolvedScope = scope;
      if (scope.type === 'user' && scope.userId === 'me' && ctx.userId) {
        resolvedScope = { type: 'user', userId: ctx.userId };
      }

      const path = buildScopedPath(resolvedScope);
      const url = `${graphqlUrl}${path}`;

      return createGqltsClient({
        url,
        headers: {
          Authorization: `Bearer ${ctx.token}`,
          'X-Request-ID': ctx.requestId ?? '',
        },
      });
    }
  }

  // Client or server without auth: Use proxy
  const path = buildProxyPath(scope);
  return createGqltsClient({ url: path });
}

export type { GqlScope } from './types';
