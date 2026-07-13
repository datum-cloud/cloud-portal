/**
 * Dev-only session exchange: `POST /api/auth/dev-session`.
 *
 * Accepts a platform access token (from `datumctl auth get-token`) as a bearer
 * credential, validates it against the platform, and fabricates a portal
 * session cookie equivalent to what the OIDC callback creates — minus the
 * refresh token, which dev sessions don't need. This lets automated tests
 * (Playwright globalSetup) obtain an authenticated portal session without
 * driving the interactive OIDC flow.
 *
 * Mounted ONLY when `NODE_ENV=development` AND `AUTH_DEV_TOKEN_EXCHANGE=1`. It
 * is a session-minting vector and must never exist in production; the handler
 * re-checks the gate defensively.
 */
import type { Variables } from '@/server/types';
import { AuthService } from '@/utils/auth';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';
import { jwtDecode } from 'jwt-decode';

/** Whether the dev token-exchange endpoint is permitted in this environment. */
export function isDevSessionEnabled(): boolean {
  return env.isDev && env.server.authDevTokenExchange === '1';
}

interface DecodedAccessToken {
  sub?: string;
  email?: string;
  exp?: number;
}

export function createDevSessionRoutes() {
  const routes = new Hono<{ Variables: Variables }>();

  routes.post('/dev-session', async (c) => {
    if (!isDevSessionEnabled()) {
      return c.json({ error: 'Not found' }, 404);
    }

    // Accept the token either as `Authorization: Bearer <token>` or a JSON body
    // `{ "token": "<token>" }` — whichever the caller finds convenient.
    let accessToken: string | undefined;
    const authHeader = c.req.header('Authorization') ?? '';
    const match = /^Bearer\s+(.+)$/i.exec(authHeader.trim());
    if (match) {
      accessToken = match[1].trim();
    } else if ((c.req.header('Content-Type') ?? '').includes('application/json')) {
      try {
        const body = (await c.req.json()) as { token?: unknown };
        if (typeof body.token === 'string') accessToken = body.token.trim();
      } catch {
        // fall through to the missing-token response
      }
    }
    if (!accessToken) {
      return c.json(
        { error: 'Missing bearer token (Authorization header or JSON { token })' },
        401
      );
    }

    let decoded: DecodedAccessToken;
    try {
      decoded = jwtDecode<DecodedAccessToken>(accessToken);
    } catch {
      return c.json({ error: 'Malformed access token' }, 401);
    }
    if (!decoded.sub) {
      return c.json({ error: 'Access token has no subject' }, 401);
    }

    // Validate the token against the platform with a cheap authenticated call.
    let validation: Response;
    try {
      validation = await fetch(
        `${env.public.apiUrl}/apis/iam.miloapis.com/v1alpha1/users/${decoded.sub}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
    } catch (err) {
      return c.json({ error: `Platform validation failed: ${String(err)}` }, 502);
    }
    if (validation.status === 401 || validation.status === 403) {
      return c.json({ error: 'Access token rejected by platform' }, 401);
    }
    if (!validation.ok) {
      return c.json({ error: `Platform validation failed: HTTP ${validation.status}` }, 502);
    }

    const expiredAt = decoded.exp
      ? new Date(decoded.exp * 1000)
      : new Date(Date.now() + 60 * 60 * 1000);

    const sessionHeaders = await AuthService.setSession(c.req.header('Cookie') ?? null, {
      accessToken,
      expiredAt,
      sub: decoded.sub,
    });
    sessionHeaders.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        c.header('Set-Cookie', value, { append: true });
      }
    });

    return c.json({
      authenticated: true,
      user: { sub: decoded.sub, email: decoded.email ?? null },
      expiredAt: expiredAt.toISOString(),
    });
  });

  return routes;
}
