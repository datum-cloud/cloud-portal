/**
 * Server-side fetch helpers for plugin origins.
 *
 * Plugin assets and manifests are always fetched by the portal server, never
 * the browser. When a plugin's `assets.caBundle` is set (an internal CA fronting
 * the asset origin), it is passed to the runtime's TLS layer. This relies on
 * Bun's non-standard `tls` fetch option — the portal server runs on Bun
 * (`react-router-hono-server/bun`).
 */

/** Bun extends `fetch` init with a `tls` option; typed loosely to stay portable. */
export interface TlsFetchInit extends RequestInit {
  tls?: {
    ca?: string;
    rejectUnauthorized?: boolean;
  };
}

/**
 * Builds fetch init that trusts a plugin's optional CA bundle. Returns the
 * given init unchanged when no bundle is configured.
 */
export function withCaBundle(init: RequestInit, caBundle?: string): TlsFetchInit {
  const trimmed = caBundle?.trim();
  if (!trimmed) return init;
  return { ...init, tls: { ca: trimmed } };
}
