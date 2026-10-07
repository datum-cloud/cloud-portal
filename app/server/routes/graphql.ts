// app/server/routes/graphql.ts
import { parseScope, buildScopedEndpoint } from '@/modules/graphql/endpoints';
import type { Variables } from '@/server/types';
import { AuthService } from '@/utils/auth';
import type { IAccessTokenSession } from '@/utils/auth/auth.types';
import { env } from '@/utils/env/env.server';
import { appendSetCookieHeaders } from '@/utils/fraud/user-access';
import { type Context, Hono } from 'hono';

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

    return await forwardGraphql(c, session, targetUrl);
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

    return await forwardGraphql(c, session, targetUrl);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 });
    }

    console.error('[graphql-proxy] Error:', error);
    return c.json({ error: error instanceof Error ? error.message : 'Proxy error' }, 502);
  }
});

/**
 * Forwards the request to `targetUrl` with the session's token. A 401 is
 * retried once with the session a concurrent refresh rotated to (Zitadel
 * revokes the old access token on rotation), and the new cookies go back to
 * the browser. Errors propagate to the caller's catch block.
 */
async function forwardGraphql(
  c: Context<{ Variables: Variables }>,
  session: IAccessTokenSession,
  targetUrl: string
): Promise<Response> {
  const controller = new AbortController();

  // Cancel upstream request if client disconnects
  c.req.raw.signal?.addEventListener('abort', () => {
    controller.abort();
  });

  const headers = graphqlUpstreamHeaders(c);
  // Read once: a retry re-sends the same body.
  const body = c.req.method !== 'GET' ? await c.req.text() : undefined;

  const call = (accessToken: string) =>
    fetch(targetUrl, {
      method: c.req.method,
      headers: { ...headers, Authorization: `Bearer ${accessToken}` },
      body,
      signal: controller.signal,
    });

  let response = await call(session.accessToken);
  let rotatedCookies: Headers | undefined;
  if (response.status === 401) {
    const retried = await AuthService.retryWithRotatedSession(
      c.req.header('Cookie') ?? null,
      session.accessToken,
      'graphql',
      call,
      (r) => r.status === 401
    );
    if (retried) {
      await response.body?.cancel();
      response = retried.result;
      rotatedCookies = retried.headers;
    }
  }

  const data = await response.json();
  const res = c.json(data, response.status as 200);
  appendSetCookieHeaders(res.headers, rotatedCookies);
  return res;
}

/** Headers forwarded upstream on every GraphQL call, minus Authorization. */
function graphqlUpstreamHeaders(c: Context<{ Variables: Variables }>): Record<string, string> {
  const browserUA = c.req.header('User-Agent');
  return {
    'Content-Type': 'application/json',
    'X-Request-ID': c.get('requestId') ?? '',
    // Propagate Sentry trace headers so portal and gateway spans stitch
    // into the same trace in Sentry.
    ...(c.req.header('sentry-trace') ? { 'sentry-trace': c.req.header('sentry-trace')! } : {}),
    ...(c.req.header('baggage') ? { baggage: c.req.header('baggage')! } : {}),
    ...(browserUA ? { 'User-Agent': browserUA } : {}),
  };
}
