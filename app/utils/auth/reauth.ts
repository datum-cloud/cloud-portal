import { paths } from '@/utils/config/paths.config';
import { getDocumentPathname } from '@/utils/helpers/path.helper';

/** Query parameter React Router adds to single-fetch data requests. */
const SINGLE_FETCH_ROUTES_PARAM = '_routes';

/**
 * Browser-safe URL of the re-auth route, carrying the page to come back to.
 * Used when a session expires mid-use: unlike `/logout`, the route keeps the
 * Zitadel session and restores `returnTo` after the silent login.
 *
 * @param returnTo Relative path (pathname + search + hash) to restore after login
 */
export function buildReauthUrl(returnTo: string): string {
  if (!returnTo) return paths.auth.reauth;
  return `${paths.auth.reauth}?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * The page a server request was loading, as a relative path to restore after
 * re-auth. A client-side navigation reaches the server as
 * `<page>.data?_routes=...`; this maps it back to `<page>` so the user does not
 * land on a raw data response after login.
 */
export function returnToForRequest(request: Request): string {
  const url = new URL(request.url);
  url.searchParams.delete(SINGLE_FETCH_ROUTES_PARAM);
  return getDocumentPathname(request) + url.search;
}

/** {@link buildReauthUrl} for the page the browser is on right now. */
export function reauthUrlForCurrentPage(): string {
  const { pathname, search, hash } = window.location;
  return buildReauthUrl(pathname + search + hash);
}
