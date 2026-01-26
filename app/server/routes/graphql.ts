import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

/**
 * GraphQL proxy route.
 * Proxies GraphQL requests from client to the GraphQL gateway with bearer token auth.
 */
export const graphqlRoutes = new Hono<{ Variables: Variables }>();

graphqlRoutes.post('/*', async (c) => {
  const session = c.get('session');

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  try {
    const controller = new AbortController();

    // Cancel upstream request if client disconnects
    c.req.raw.signal?.addEventListener('abort', () => {
      controller.abort();
    });

    const body = await c.req.text();

    const response = await fetch(env.public.graphqlUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
        'X-Request-ID': c.get('requestId'),
      },
      body,
      signal: controller.signal,
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 }); // Client Closed Request
    }

    console.error('[graphql] Error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'GraphQL proxy error' }, 502);
  }
});
