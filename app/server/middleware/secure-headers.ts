import { EMPTY_PLUGIN_CSP_ADDITIONS, type PluginCspAdditions } from '@/modules/plugins/server/csp';
import type { MiddlewareHandler } from 'hono';
import { NONCE, secureHeaders } from 'hono/secure-headers';

export interface SecureHeadersOptions {
  isDev: boolean;
  apiUrl?: string;
  getPluginCspAdditions?: () => PluginCspAdditions;
}

function buildSecureHeaders(
  isDev: boolean,
  apiUrl: string | undefined,
  plugins: PluginCspAdditions
): MiddlewareHandler {
  return secureHeaders({
    // Equivalent to xPoweredBy: false - Hono doesn't send x-powered-by by default
    xFrameOptions: 'SAMEORIGIN', // Part of frame-src: self
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'same-origin', // Matches your Helmet config
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
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
        "'unsafe-inline'",
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
      ...(plugins.workerSrc.length > 0 ? { workerSrc: plugins.workerSrc } : {}),
      // Only in production: upgrade HTTP→HTTPS. Omit in dev so Safari (and others) can use http://localhost
      ...(isDev ? {} : { upgradeInsecureRequests: [] }),
    },
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
}: SecureHeadersOptions): MiddlewareHandler {
  let current = EMPTY_PLUGIN_CSP_ADDITIONS;
  let handler = buildSecureHeaders(isDev, apiUrl, current);
  return (c, next) => {
    const additions = getPluginCspAdditions();
    if (additions !== current) {
      current = additions;
      handler = buildSecureHeaders(isDev, apiUrl, additions);
    }
    return handler(c, next);
  };
}
