// app/server/routes/graphql.ts
import { parseScope, buildScopedEndpoint } from '@/modules/gqlts/endpoints';
import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

/**
 * GraphQL proxy routes.
 * Forwards requests to the scoped GraphQL gateway endpoint.
 */
export const graphqlRoutes = new Hono<{ Variables: Variables }>();

// Scoped endpoint: /api/graphql/:scopeType/:scopeId
graphqlRoutes.all('/:scopeType/:scopeId', async (c) => {
  const { scopeType, scopeId } = c.req.param();
  const session = c.get('session');

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    // Replace 'me' with actual user ID from session
    const resolvedScopeId = scopeType === 'user' && scopeId === 'me' ? session.sub : scopeId;
    const scope = parseScope(scopeType, resolvedScopeId);
    const targetUrl = buildScopedEndpoint(env.public.graphqlUrl, scope);

    const controller = new AbortController();

    // Cancel upstream request if client disconnects
    c.req.raw.signal?.addEventListener('abort', () => {
      controller.abort();
    });

    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Request-ID': c.get('requestId') ?? '',
      },
      body: c.req.method !== 'GET' ? await c.req.text() : undefined,
      signal: controller.signal,
    });

    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Response(null, { status: 499 });
      }
      if (error.message.includes('Unknown scope type')) {
        return c.json({ error: error.message }, 400);
      }
    }

    console.error('[graphql-proxy] Error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Proxy error' }, 502);
  }
});

// Global endpoint: /api/graphql (no scope)
graphqlRoutes.all('/', async (c) => {
  const session = c.get('session');

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const targetUrl = `${env.public.graphqlUrl}/graphql`;

    const controller = new AbortController();

    c.req.raw.signal?.addEventListener('abort', () => {
      controller.abort();
    });

    const response = await fetch(targetUrl, {
      method: c.req.method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
        'X-Request-ID': c.get('requestId') ?? '',
      },
      body: c.req.method !== 'GET' ? await c.req.text() : undefined,
      signal: controller.signal,
    });

    const data = await response.json();
    return c.json(data, response.status as 200);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }

    console.error('[graphql-proxy] Error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Proxy error' }, 502);
  }
});
