import { EMPTY_PLUGIN_CSP_ADDITIONS, type PluginCspAdditions } from '@/modules/plugins/server/csp';
import type { MiddlewareHandler } from 'hono';
import { NONCE, secureHeaders } from 'hono/secure-headers';

export interface SecureHeadersOptions {
  isDev: boolean;
  apiUrl?: string;
  getPluginCspAdditions?: () => PluginCspAdditions;
  /** Allowed in the report-only `form-action`. Defaults to the AUTH_OIDC_ISSUER origin. */
  authOrigin?: string;
  /** Report-only violations go here. Defaults to Sentry's endpoint for SENTRY_DSN. */
  cspReportUri?: string;
}

type CspDirectives = NonNullable<
  NonNullable<Parameters<typeof secureHeaders>[0]>['contentSecurityPolicy']
>;

/**
 * Sentry's CSP report endpoint for a DSN (`https://<key>@<host>/<project>`):
 * `https://<host>/api/<project>/security/?sentry_key=<key>`. Undefined when
 * there is no DSN or it does not parse.
 */
export function sentryCspReportUri(
  dsn: string | undefined,
  environment?: string
): string | undefined {
  if (!dsn) return undefined;
  try {
    const url = new URL(dsn);
    const segments = url.pathname.split('/').filter(Boolean);
    const projectId = segments.pop();
    if (!url.username || !projectId) return undefined;
    const prefix = segments.length ? `/${segments.join('/')}` : '';
    const report = new URL(`${url.protocol}//${url.host}${prefix}/api/${projectId}/security/`);
    report.searchParams.set('sentry_key', url.username);
    if (environment) report.searchParams.set('sentry_environment', environment);
    return report.toString();
  } catch {
    return undefined;
  }
}

function originOf(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    return new URL(url).origin;
  } catch {
    return undefined;
  }
}

/**
 * The enforced policy plus the directives it lacks, sent as
 * Content-Security-Policy-Report-Only until the reports are clean. `form-action`
 * includes the IdP because sign-out is a form POST that redirects there, and
 * Chrome applies `form-action` to redirects. `frame-ancestors 'self'` matches
 * the X-Frame-Options header already sent.
 */
function buildReportOnlyPolicy(
  enforced: CspDirectives,
  authOrigin: string | undefined,
  reportUri: string | undefined
): CspDirectives {
  const { reportTo: _reportTo, ...directives } = enforced;
  return {
    ...directives,
    baseUri: ["'self'"],
    objectSrc: ["'none'"],
    formAction: ["'self'", ...(authOrigin ? [authOrigin] : [])],
    frameAncestors: ["'self'"],
    ...(reportUri ? { reportUri: [reportUri] } : {}),
  };
}

interface PolicyInputs {
  isDev: boolean;
  apiUrl: string | undefined;
  authOrigin: string | undefined;
  reportUri: string | undefined;
}

function buildSecureHeaders(
  { isDev, apiUrl, authOrigin, reportUri }: PolicyInputs,
  plugins: PluginCspAdditions
): MiddlewareHandler {
  const contentSecurityPolicy: CspDirectives = {
    reportTo: isDev ? '/' : undefined,
    defaultSrc: ["'self'"],
    connectSrc: [
      "'self'",
      ...(isDev ? ['ws:'] : []),
      apiUrl ?? '',
      'https://*.sentry.io',
      'https://*.datum.net',
      'https://*.cloudfront.net',
      'https://*.helpscout.net',
      'https://app.rybbit.io', // Rybbit
      'https://api.stripe.com',
      'https://maps.googleapis.com', // Maps JS / legacy Places
      'https://places.googleapis.com', // Places API (New) autocomplete RPC
      ...plugins.connectSrc,
    ],
    fontSrc: [
      "'self'",
      'https://*.jsdelivr.net',
      'https://*.gstatic.com',
      'https://*.helpscout.net',
    ],
    frameSrc: [
      "'self'",
      'https://*.sentry.io',
      'https://*.datum.net',
      'https://*.cloudfront.net',
      'https://*.helpscout.net',
      'https://js.stripe.com',
      'https://hooks.stripe.com',
    ],
    imgSrc: [
      "'self'",
      'data:',
      'https://*.googleusercontent.com', // Google user avatars
      'https://*.githubusercontent.com', // GitHub user avatars
      'https://avatars.githubusercontent.com', // GitHub avatars (alternative domain)
      'https://*.cloudfront.net',
      'https://*.cartocdn.com', // Leaflet map tiles (CARTO basemaps - basemaps.cartocdn.com)
      'https://*.basemaps.cartocdn.com', // Tile subdomains (a.basemaps, b.basemaps, etc.)
      'https://*.stripe.com',
    ],
    // Allow scripts - in dev mode, allow unsafe-inline and unsafe-eval for Vite HMR
    scriptSrc: [
      "'strict-dynamic'",
      "'self'",
      NONCE,
      'https://maps.googleapis.com',
      'https://*.gstatic.com',
      ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      ...plugins.scriptSrc,
    ],
    scriptSrcElem: [
      "'strict-dynamic'",
      "'self'",
      'https://js.sentry-cdn.com',
      'https://browser.sentry-cdn.com',
      'https://js.stripe.com',
      'https://maps.googleapis.com',
      'https://*.gstatic.com',
      NONCE,
      ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
    ],
    scriptSrcAttr: [NONCE, ...(isDev ? ["'unsafe-inline'"] : [])],
    // Allow inline styles for third-party widgets
    styleSrc: ["'self'", "'unsafe-inline'", 'https://*.jsdelivr.net', 'https://*.googleapis.com'],
    // Only in production: upgrade HTTP→HTTPS. Omit in dev so Safari (and others) can use http://localhost
    ...(isDev ? {} : { upgradeInsecureRequests: [] }),
  };

  return secureHeaders({
    // Equivalent to xPoweredBy: false - Hono doesn't send x-powered-by by default
    xFrameOptions: 'SAMEORIGIN', // Part of frame-src: self
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'same-origin', // Matches your Helmet config
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy,
    contentSecurityPolicyReportOnly: buildReportOnlyPolicy(
      contentSecurityPolicy,
      authOrigin,
      reportUri
    ),
    // Disable HSTS in dev so Safari doesn't force HTTPS for localhost
    strictTransportSecurity: !isDev,
  });
}

/**
 * Security headers with a per-request CSP nonce. Plugin CSP additions are
 * merged in when present; the middleware is rebuilt only when they change.
 */
export function secureHeadersMiddleware({
  isDev,
  apiUrl,
  getPluginCspAdditions = () => EMPTY_PLUGIN_CSP_ADDITIONS,
  authOrigin = originOf(process.env.AUTH_OIDC_ISSUER),
  cspReportUri = sentryCspReportUri(process.env.SENTRY_DSN, process.env.SENTRY_ENV),
}: SecureHeadersOptions): MiddlewareHandler {
  const inputs: PolicyInputs = { isDev, apiUrl, authOrigin, reportUri: cspReportUri };
  let current = EMPTY_PLUGIN_CSP_ADDITIONS;
  let handler = buildSecureHeaders(inputs, current);
  return (c, next) => {
    const additions = getPluginCspAdditions();
    if (additions !== current) {
      current = additions;
      handler = buildSecureHeaders(inputs, additions);
    }
    return handler(c, next);
  };
}
