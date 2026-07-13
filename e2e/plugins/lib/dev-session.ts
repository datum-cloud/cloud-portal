/**
 * Exchange a platform token for a portal session cookie via the dev-only
 * `POST /api/auth/dev-session` endpoint (gated by AUTH_DEV_TOKEN_EXCHANGE=1,
 * owned by portal-core), and persist it as a Playwright storageState.
 *
 * The session cookie is host-scoped (`localhost`, no port), so the single
 * storageState authenticates both the Tier 0 and Tier 1 portal origins.
 */
import { DEV_SESSION_PATH, SESSION_COOKIE_NAME, STORAGE_STATE } from './config';
import fs from 'node:fs';
import path from 'node:path';

interface ParsedCookie {
  name: string;
  value: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'Strict' | 'Lax' | 'None';
}

function parseSetCookie(header: string): ParsedCookie | null {
  const parts = header.split(';').map((p) => p.trim());
  const [nameValue, ...attrs] = parts;
  const eq = nameValue.indexOf('=');
  if (eq < 0) return null;
  const cookie: ParsedCookie = {
    name: nameValue.slice(0, eq),
    value: nameValue.slice(eq + 1),
    path: '/',
    expires: -1,
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  };
  for (const attr of attrs) {
    const [k, v] = attr.split('=');
    const key = k.toLowerCase();
    if (key === 'path') cookie.path = v ?? '/';
    else if (key === 'httponly') cookie.httpOnly = true;
    else if (key === 'secure') cookie.secure = true;
    else if (key === 'max-age' && v) cookie.expires = Math.floor(Date.now() / 1000) + Number(v);
    else if (key === 'expires' && v) cookie.expires = Math.floor(new Date(v).getTime() / 1000);
    else if (key === 'samesite' && v) {
      const s = v.toLowerCase();
      cookie.sameSite = s === 'strict' ? 'Strict' : s === 'none' ? 'None' : 'Lax';
    }
  }
  return cookie;
}

/**
 * POST the token to the portal's dev-session endpoint and write a storageState
 * file containing the resulting session cookie. Returns the storageState path.
 */
export async function exchangeTokenForStorageState(params: {
  portalUrl: string;
  token: string;
}): Promise<string> {
  const url = `${params.portalUrl}${DEV_SESSION_PATH}`;
  // portal-core's handler reads the token from the Authorization header
  // (Bearer), validates it against API_URL, and mints a `_session` cookie.
  const res = await fetch(url, {
    method: 'POST',
    redirect: 'manual',
    headers: { Authorization: `Bearer ${params.token}` },
  });

  if (res.status !== 200) {
    const body = await res.text().catch(() => '');
    throw new Error(
      `dev-session exchange failed: ${res.status} at ${url}. ` +
        `Ensure the portal was launched in dev with AUTH_DEV_TOKEN_EXCHANGE=1, and that ` +
        `API_URL points at the environment the token is valid for. Body: ${body.slice(0, 300)}`
    );
  }

  // Node/undici exposes all Set-Cookie values via getSetCookie().
  const setCookies: string[] =
    (res.headers as any).getSetCookie?.() ??
    (res.headers.get('set-cookie') ? [res.headers.get('set-cookie') as string] : []);

  const session = setCookies
    .map(parseSetCookie)
    .find((c): c is ParsedCookie => !!c && c.name === SESSION_COOKIE_NAME);

  if (!session) {
    throw new Error(
      `dev-session returned 200 but no "${SESSION_COOKIE_NAME}" cookie was set ` +
        `(saw: ${setCookies.map((c) => c.split('=')[0]).join(', ') || 'none'}). ` +
        `Confirm the cookie name with portal-core.`
    );
  }

  const storageState = {
    cookies: [
      {
        name: session.name,
        value: session.value,
        domain: 'localhost',
        path: session.path,
        expires: session.expires,
        httpOnly: session.httpOnly,
        secure: session.secure,
        sameSite: session.sameSite,
      },
    ],
    origins: [] as unknown[],
  };

  fs.mkdirSync(path.dirname(STORAGE_STATE), { recursive: true });
  fs.writeFileSync(STORAGE_STATE, JSON.stringify(storageState, null, 2));
  return STORAGE_STATE;
}
