import { initializeObservability } from '../../observability';
import { authMiddleware } from './middleware/auth';
import { buildContext } from './middleware/context';
import { errorHandler } from './middleware/error-handler';
import { loggerMiddleware } from './middleware/logger';
import { rateLimiter } from './middleware/rate-limit';
import { sentryTracingMiddleware } from './middleware/sentry-tracing';
import { registerApiRoutes } from './routes';
import type { Variables } from './types';
import { Logger } from '@/modules/logger';
import { AuthService } from '@/utils/auth/auth.service';
import { env } from '@/utils/env/env.server';
import { prometheus } from '@hono/prometheus';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { NONCE, secureHeaders } from 'hono/secure-headers';
import { createHonoServer } from 'react-router-hono-server/bun';

// Initialize observability (OTEL + Sentry + error handlers)
initializeObservability().catch((error: unknown) => {
  console.error('❌ Failed to initialize observability:', error);
});

// Note: createControlPlaneClient is now
// imported via buildContext from './middleware/context'

const app = new Hono<{ Variables: Variables }>();

// Prometheus metrics (OpenTelemetry handled by observability factory)
if (env.public.otelEnabled) {
  // Prometheus metrics
  const { printMetrics, registerMetrics } = prometheus();
  // Register metrics collection middleware (before other middleware)
  app.use('*', registerMetrics);
  app.get('/metrics', printMetrics);
}

// Global middleware
app.use('*', sentryTracingMiddleware());
app.use(requestId());
app.use('*', loggerMiddleware());

const isDev = process.env.NODE_ENV === 'development';

// Disable CSP in development - Vite HMR and React devtools need inline scripts
app.use(
  '*',
  secureHeaders({
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
        env.public.apiUrl ?? '',
        'https://*.marker.io',
        'https://*.sentry.io',
        'https://*.datum.net',
        'https://*.cloudfront.net',
        'https://*.helpscout.net',
      ],
      fontSrc: ["'self'", "'unsafe-inline'", 'https://*.jsdelivr.net', 'https://*.gstatic.com'],
      frameSrc: [
        "'self'",
        'https://*.marker.io',
        'https://*.sentry.io',
        'https://*.datum.net',
        'https://*.cloudfront.net',
        'https://*.helpscout.net',
      ],
      imgSrc: [
        "'self'",
        'data:',
        'https://*.googleusercontent.com', // Google user avatars
        'https://*.githubusercontent.com', // GitHub user avatars
        'https://avatars.githubusercontent.com', // GitHub avatars (alternative domain)
        'https://*.cloudfront.net',
      ],
      // Allow scripts - in dev mode, allow unsafe-inline and unsafe-eval for Vite HMR
      scriptSrc: [
        "'strict-dynamic'",
        "'self'",
        NONCE,
        ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      ],
      scriptSrcElem: [
        "'strict-dynamic'",
        "'self'",
        'https://js.sentry-cdn.com',
        'https://browser.sentry-cdn.com',
        NONCE,
        ...(isDev ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
      ],
      scriptSrcAttr: [NONCE, ...(isDev ? ["'unsafe-inline'"] : [])],
      // Allow inline styles for third-party widgets
      styleSrc: ["'self'", "'unsafe-inline'", 'https://*.jsdelivr.net', 'https://*.googleapis.com'],
      upgradeInsecureRequests: [],
    },
  })
);

app.use('/api/*', rateLimiter());
app.onError(errorHandler);

// Register API routes
registerApiRoutes(app);

// Public routes
app.get('/_healthz', (c) => c.json({ status: 'ok' }));
app.get('/_readyz', (c) => c.json({ status: 'ready' }));

// API proxy (authenticated)
app.use('/api/proxy/*', authMiddleware());
app.all('/api/proxy/*', async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname.replace('/api/proxy', '');
  const queryString = url.search; // Includes ?watch=true&resourceVersion=0 etc.
  const session = c.get('session');

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const response = await fetch(`${env.public.apiUrl}${path}${queryString}`, {
    method: c.req.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': c.req.header('Content-Type') ?? 'application/json',
      'X-Request-ID': c.get('requestId'),
    },
    body: c.req.method !== 'GET' ? await c.req.text() : undefined,
  });

  // Remove encoding headers to prevent double-decoding by the browser
  // The fetch API already decodes the response body
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');

  return new Response(response.body, {
    status: response.status,
    headers,
  });
});

// User-scoped API proxy (authenticated) - for user-specific APIs like organization memberships
// Base URL: {API_URL}/apis/iam.miloapis.com/v1alpha1/users/{userId}/control-plane/
app.use('/api/user-proxy/*', authMiddleware());
app.all('/api/user-proxy/*', async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname.replace('/api/user-proxy', '');
  const queryString = url.search;
  const session = c.get('session');

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const userScopedBaseUrl = `${env.public.apiUrl}/apis/iam.miloapis.com/v1alpha1/users/${session.sub}/control-plane`;
  const response = await fetch(`${userScopedBaseUrl}${path}${queryString}`, {
    method: c.req.method,
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      'Content-Type': c.req.header('Content-Type') ?? 'application/json',
      'X-Request-ID': c.get('requestId'),
    },
    body: c.req.method !== 'GET' ? await c.req.text() : undefined,
  });

  // Remove encoding headers to prevent double-decoding by the browser
  // The fetch API already decodes the response body
  const headers = new Headers(response.headers);
  headers.delete('content-encoding');
  headers.delete('transfer-encoding');

  return new Response(response.body, {
    status: response.status,
    headers,
  });
});

// React Router SSR - must await createHonoServer for production build
// Without await, serverModule.default is a Promise (no .fetch method)
// which causes start.js to skip Bun.serve()
export default await createHonoServer({
  app,

  getLoadContext: async (c) => {
    const requestId = c.get('requestId') ?? crypto.randomUUID();
    const cspNonce = c.get('secureHeadersNonce') ?? '';
    const cookieHeader = c.req.header('Cookie') ?? null;

    const { session, headers } = await AuthService.getValidSession(cookieHeader);

    headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        c.header('Set-Cookie', value, { append: true });
      }
    });

    // Use shared context builder
    const { controlPlaneClient, userScopedClient } = await buildContext(session);

    // Create request-scoped logger
    const logger = new Logger({
      requestId,
      path: c.req.path,
      method: c.req.method,
    });

    // Spread controlPlaneClient to satisfy AppLoadContext extends ControlPlaneClient
    return {
      ...controlPlaneClient,
      // Data-driven properties
      requestId,
      cspNonce,
      session,
      controlPlaneClient,
      userScopedClient,
      logger,
    };
  },
});
