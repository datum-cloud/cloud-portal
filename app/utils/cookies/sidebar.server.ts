/**
 * Name of the cookie datum-ui's `SidebarProvider` writes whenever the user
 * pins or collapses the main nav.
 *
 * Unlike every other cookie in this directory, this one is NOT created with
 * `createCookie()`. The provider writes it client-side:
 *
 *   document.cookie = `sidebar_state=${open}; path=/; max-age=604800`
 *
 * so it is plain, unsigned and not `httpOnly`. Reading it through
 * `createCookie({ secrets, httpOnly })` — the pattern the neighbouring modules
 * use — would silently never match. Hence the hand-rolled parse below.
 */
export const SIDEBAR_COOKIE_NAME = 'sidebar_state';

/**
 * Reads the persisted main-nav state out of a `Cookie` header.
 *
 * Returns `undefined` rather than a boolean when the user has expressed no
 * preference (no cookie, or a value we don't recognise), so callers can fall
 * back to their own default instead of being handed a guess.
 */
export function parseSidebarState(cookieHeader: string | null): boolean | undefined {
  if (!cookieHeader) return undefined;

  for (const pair of cookieHeader.split(';')) {
    const separator = pair.indexOf('=');
    if (separator === -1) continue;

    if (pair.slice(0, separator).trim() !== SIDEBAR_COOKIE_NAME) continue;

    const value = pair.slice(separator + 1).trim();
    if (value === 'true') return true;
    if (value === 'false') return false;
    return undefined;
  }

  return undefined;
}

/** Reads the persisted main-nav state off an incoming request. */
export function getSidebarState(request: Request): boolean | undefined {
  return parseSidebarState(request.headers.get('Cookie'));
}
