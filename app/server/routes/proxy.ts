import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

/**
 * Proxy routes for K8s API passthrough.
 * Handles regular requests and K8s Watch API streaming (SSE).
 */
export const proxyRoutes = new Hono<{ Variables: Variables }>();

proxyRoutes.all('/*', async (c) => {
  const url = new URL(c.req.url);
  let path = url.pathname.replace('/api/proxy', '');
  const queryString = url.search;
  const session = c.get('session');
  const isWatch = url.searchParams.get('watch') === 'true';

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Replace /users/me/ with actual user ID from session
  if (path.includes('/users/me/')) {
    path = path.replace('/users/me/', `/users/${session.sub}/`);
  }

  try {
    const controller = new AbortController();

    // Cancel upstream request if client disconnects
    c.req.raw.signal?.addEventListener('abort', () => {
      controller.abort();
    });

    // Resolve the real client IP from X-Forwarded-For set by Envoy Gateway.
    const clientIP = c.req.header('X-Forwarded-For')?.split(',')[0]?.trim();

    const upstreamHeaders: Record<string, string> = {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': c.req.header('Content-Type') ?? 'application/json',
      'X-Request-ID': c.get('requestId'),
    };

    // Forward the browser's User-Agent so the API server audit log captures it.
    const browserUA = c.req.header('User-Agent');
    if (browserUA) {
      upstreamHeaders['User-Agent'] = browserUA;
    }

    // Forward the client IP so the API server audit log captures it in sourceIPs.
    if (clientIP) {
      upstreamHeaders['X-Forwarded-For'] = clientIP;
    }

    const response = await fetch(`${env.public.apiUrl}${path}${queryString}`, {
      method: c.req.method,
      headers: upstreamHeaders,
      body: c.req.method !== 'GET' ? await c.req.text() : undefined,
      signal: controller.signal,
    });

    // Remove encoding headers to prevent double-decoding
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('transfer-encoding');

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(null, { status: 499 }); // Client Closed Request
    }

    console.error('[proxy] Error:', isWatch ? '(watch)' : '', error);
    return c.json({ error: error instanceof Error ? error.message : 'Proxy error' }, 502);
  }
});
