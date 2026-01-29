// app/modules/gqlts/client.server.ts
// Server-side gqlts client - direct API access with auth from request context
import { buildScopedPath } from './endpoints';
import { createClient as createGqltsClient } from './generated';
import type { GqlScope } from './types';
import { getRequestContext } from '@/modules/axios/request-context';
import { LOGGER_CONFIG } from '@/modules/logger/logger.config';
import { env } from '@/utils/env/env.server';

// Generate curl command for debugging
function generateGqlCurl(url: string, headers: Record<string, string>, body?: any): string {
  const parts = ['curl -X POST'];
  parts.push(`'${url}'`);

  for (const [key, value] of Object.entries(headers)) {
    if (value) {
      const escapedValue = key === 'Authorization' ? 'Bearer [REDACTED]' : value;
      parts.push(`-H '${key}: ${escapedValue}'`);
    }
  }
  parts.push("-H 'Content-Type: application/json'");

  if (body) {
    const bodyStr = JSON.stringify(body, null, 2).replace(/'/g, "'\\''");
    parts.push(`-d '${bodyStr}'`);
  }

  return parts.join(' \\\n  ');
}

/**
 * Creates a Gqlts client for server-side use.
 * Connects directly to the GraphQL API with auth from request context.
 */
export function createGqlClient(scope: GqlScope) {
  const ctx = getRequestContext();
  const logCurl = LOGGER_CONFIG.logCurl;

  // Resolve 'me' to actual userId from context
  let resolvedScope = scope;
  if (scope.type === 'user' && scope.userId === 'me' && ctx?.userId) {
    resolvedScope = { type: 'user', userId: ctx.userId };
  }

  const path = buildScopedPath(resolvedScope);
  const url = `${env.public.graphqlUrl}${path}`;

  const headers: Record<string, string> = {
    'X-Request-ID': ctx?.requestId ?? '',
  };

  if (ctx?.token) {
    headers['Authorization'] = `Bearer ${ctx.token}`;
  }

  if (logCurl) {
    console.log('[gqlts:server] URL:', url);
    console.log('[gqlts:server] Scope:', resolvedScope);
    console.log('[gqlts:server] Context:', {
      hasToken: !!ctx?.token,
      userId: ctx?.userId,
      requestId: ctx?.requestId,
    });
  }

  return createGqltsClient({
    url,
    headers,
    fetcherMethod: async (operation) => {
      if (logCurl) {
        console.log('[gqlts:server] Curl:');
        console.log(generateGqlCurl(url, headers, operation));
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(operation),
      });

      const data = await response.json();

      if (logCurl) {
        console.log('[gqlts:server] Status:', response.status);
        console.log('[gqlts:server] Response:', JSON.stringify(data, null, 2));
      }

      return data;
    },
  });
}

export type { GqlScope } from './types';
