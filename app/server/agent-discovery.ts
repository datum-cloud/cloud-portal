/**
 * Discovery surface for OAuth clients and agents.
 *
 * A client that holds no credentials still needs to work out how to get them.
 * RFC 9728 Protected Resource Metadata and RFC 8288 Link headers exist for
 * exactly that, which is why everything here has to be reachable without a
 * session — discovery that required a login would be circular.
 *
 * Pure builders, kept apart from the Hono wiring so they can be tested without
 * standing up a server.
 */

/** Shape defined by RFC 9728 §2. */
export type ProtectedResourceMetadata = {
  resource: string;
  authorization_servers: string[];
  scopes_supported: string[];
  bearer_methods_supported: string[];
};

/** Path RFC 9728 §3 reserves for the metadata document. */
export const RESOURCE_METADATA_PATH = '/.well-known/oauth-protected-resource';

/**
 * Scopes the portal's own OIDC client requests, mirroring what the issuer
 * publishes in its `openid-configuration`.
 */
const SCOPES_SUPPORTED = [
  'openid',
  'profile',
  'email',
  'phone',
  'address',
  'offline_access',
] as const;

/**
 * Links advertised on HTML responses. The relation types are the registered
 * ones from RFC 8288 / RFC 9727 §3 — an agent matches on `rel`, so inventing
 * names here would make the header unreadable to it.
 */
const LINKS = [
  { href: RESOURCE_METADATA_PATH, rel: 'service-desc', type: 'application/json' },
  { href: 'https://docs.datum.net', rel: 'service-doc' },
] as const;

/** Reduces a URL to its origin, or returns null when it isn't one. */
function toOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

/**
 * Builds the metadata document.
 *
 * An unparseable issuer yields an empty `authorization_servers` rather than a
 * malformed entry: a client can act on "none advertised", but a broken URL
 * would send it somewhere that does not exist.
 */
export function buildProtectedResourceMetadata(
  appUrl: string,
  issuer: string
): ProtectedResourceMetadata {
  const authorizationServer = toOrigin(issuer);

  return {
    resource: toOrigin(appUrl) ?? appUrl,
    authorization_servers: authorizationServer ? [authorizationServer] : [],
    scopes_supported: [...SCOPES_SUPPORTED],
    bearer_methods_supported: ['header'],
  };
}

/** Absolute URL of the metadata document for a given portal origin. */
export function resourceMetadataUrl(appUrl: string): string {
  return `${toOrigin(appUrl) ?? appUrl.replace(/\/+$/, '')}${RESOURCE_METADATA_PATH}`;
}

/**
 * `WWW-Authenticate` value for a 401, per RFC 9728 §5.1. Tells a caller that
 * lacks credentials where to learn how to obtain them, which a bare 401 does
 * not.
 */
export function buildResourceChallenge(appUrl: string): string {
  return `Bearer resource_metadata="${resourceMetadataUrl(appUrl)}"`;
}

/** Single RFC 8288 `Link` header value carrying every advertised link. */
export function buildLinkHeader(): string {
  return LINKS.map((link) => {
    const attrs = [`rel="${link.rel}"`];
    if ('type' in link && link.type) attrs.push(`type="${link.type}"`);
    return `<${link.href}>; ${attrs.join('; ')}`;
  }).join(', ');
}
