// app/utils/env/auth-ui-origin.ts
// Shared between env.server.ts (validated server env) and index.ts (SSR/client
// hydration) so both derive the same value.

/**
 * Path prefix auth-ui is mounted under. Deployed environments route this
 * prefix to the auth-ui service while the rest of the host goes to Zitadel
 * (infra HTTPRoutes `zitadel` and `zitadel-auth-ui` share one gateway
 * listener), so the mount point lives here rather than at each call site.
 */
export const AUTH_UI_PATH_PREFIX = '/id';

const trimTrailingSlashes = (url: string): string => url.replace(/\/+$/, '');

/**
 * Resolves the origin auth-ui is served from.
 *
 * Because auth-ui is path-mounted on the Zitadel hostname, deployed
 * environments need no configuration — the origin is derived from the OIDC
 * issuer. `AUTH_UI_ORIGIN` overrides that for local development, where
 * auth-ui runs on its own port against a remote issuer.
 *
 * Returns an origin with no trailing slash; callers append
 * {@link AUTH_UI_PATH_PREFIX}. Returns '' when neither value is usable, which
 * matches the pre-hydration client default.
 */
export function resolveAuthUiOrigin(
  authUiOrigin: string | undefined,
  authOidcIssuer: string | undefined
): string {
  if (authUiOrigin) {
    try {
      // Strip any path the operator included. `.env.example` warns not to append
      // /id, but a comment is not a guard — and this override is the one value a
      // human actually types, so it is the branch most likely to carry the /id
      // that yields /id/id/passkeys. The derived branch below already normalises.
      return new URL(authUiOrigin).origin;
    } catch {
      // Not a parseable URL (env.server.ts rejects that at startup); preserve
      // the previous best-effort behaviour rather than throwing mid-render.
      return trimTrailingSlashes(authUiOrigin);
    }
  }

  if (!authOidcIssuer) {
    return '';
  }

  try {
    return new URL(authOidcIssuer).origin;
  } catch {
    // Issuer isn't a parseable URL. env.server.ts rejects that case at
    // startup; on the client we degrade to '' rather than throwing mid-render.
    return '';
  }
}
