import { isEmailNotVerifiedDenial } from '@/features/account/email-verification/email-verification-error';
import { extractQuotaDenialLabels, quotaDeniedTotal } from '@/server/observability/quota-metrics';
import type { Variables } from '@/server/types';
import { AuthService } from '@/utils/auth';
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

    // Read once: a verification retry below re-sends the same body, and
    // c.req.text() is not guaranteed to survive a second call.
    const requestBody = c.req.method !== 'GET' ? await c.req.text() : undefined;

    const callUpstream = (accessToken: string) =>
      fetch(`${env.public.apiUrl}${path}${queryString}`, {
        method: c.req.method,
        headers: { ...upstreamHeaders, Authorization: `Bearer ${accessToken}` },
        body: requestBody,
        signal: controller.signal,
      });

    let response = await callUpstream(session.accessToken);
    let rotatedCookies: Headers | undefined;

    // Remove encoding headers to prevent double-decoding
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('transfer-encoding');

    // Count real quota rejections (the "advisory gate missed" signal). Non-watch
    // 403s only — watch streams must keep streaming untouched.
    if (response.status === 403 && !isWatch) {
      let text = await response.text();
      const labels = extractQuotaDenialLabels(text);
      if (labels) {
        quotaDeniedTotal.inc(labels);
      }

      // A verification denial is more often a stale TokenReview than a genuinely
      // unverified account: the apiserver caches reviews per token for ~2
      // minutes, so milo can still be holding "unverified" after the user has
      // verified. Refreshing mints a new token, which is a new cache key, so the
      // next call re-introspects. Same shape as getUserWithAccessRetry's 403
      // retry.
      //
      // Once only. If it survives a fresh introspection the account really is
      // unverified, and the client redirects to /verify-email on the cause.
      if (isEmailNotVerifiedDenial(text)) {
        const retried = await retryAfterRefresh(c.req.header('Cookie') ?? null, callUpstream);
        if (retried) {
          response = retried.response;
          rotatedCookies = retried.cookies;
          text = await response.text();
        }
      }

      const outHeaders = withRotatedCookies(new Headers(response.headers), rotatedCookies);
      outHeaders.delete('content-encoding');
      outHeaders.delete('transfer-encoding');
      return new Response(text, { status: response.status, headers: outHeaders });
    }

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

/**
 * Refresh the session and re-issue the upstream call once. Returns null when
 * there is nothing to refresh with, or the refresh itself fails — the caller
 * then returns the original 403 rather than masking it.
 */
async function retryAfterRefresh(
  cookieHeader: string | null,
  callUpstream: (accessToken: string) => Promise<Response>
): Promise<{ response: Response; cookies: Headers } | null> {
  const { refreshToken, rawSession: refreshRaw } = await AuthService.getRefreshToken(cookieHeader);
  if (!refreshToken) return null;

  const { rawSession: sessionRaw } = await AuthService.getSession(cookieHeader);

  try {
    const { session, headers } = await AuthService.refreshTokens(
      refreshToken,
      sessionRaw,
      refreshRaw
    );
    return { response: await callUpstream(session.accessToken), cookies: headers };
  } catch {
    return null;
  }
}

/**
 * Zitadel rotates refresh tokens, so a rotation the browser never receives
 * leaves the next request presenting one the IdP has already invalidated.
 */
function withRotatedCookies(target: Headers, rotated?: Headers): Headers {
  rotated?.forEach((value, key) => {
    if (key.toLowerCase() === 'set-cookie') {
      target.append('Set-Cookie', value);
    }
  });
  return target;
}
