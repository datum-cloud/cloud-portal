import { initializeObservability } from '../../observability';
import { sessionMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { loggerMiddleware } from './middleware/logger';
import { requestContextMiddleware } from './middleware/request-context';
import { sentryTracingMiddleware } from './middleware/sentry-tracing';
import { createApiApp } from './routes/api';
import type { Variables } from './types';
// Configure all @hey-api generated clients to use server axios instance
// This allows generated OpenAPI functions to work on server-side
// Token and requestId will be auto-injected via AsyncLocalStorage
import '@/modules/control-plane/setup.server';
import { Logger } from '@/modules/logger';
import { checkRedisHealth } from '@/modules/redis';
import { env } from '@/utils/env/env.server';
import { prometheus } from '@hono/prometheus';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import { NONCE, secureHeaders } from 'hono/secure-headers';
import { createHonoServer } from 'react-router-hono-server/bun';

let isShuttingDown = false;
const beginShutdown = () => {
  isShuttingDown = true;
};

process.once('SIGTERM', beginShutdown);
process.once('SIGINT', beginShutdown);

// Initialize observability (OTEL + Sentry + error handlers)
initializeObservability().catch((error: unknown) => {
  console.error('❌ Failed to initialize observability:', error);
});

// Check Redis connection on startup (non-blocking)
checkRedisHealth()
  .then((result) => {
    if (!result.available && result.error !== 'Redis not configured') {
      console.warn('⚠️  Redis health check failed:', result.error);
      console.warn('⚠️  Falling back to in-memory rate limiting');
    }
  })
  .catch((error: unknown) => {
    console.error('❌ Unexpected error during Redis health check:', error);
  });

const app = new Hono<{ Variables: Variables }>();

// Prometheus metrics (OpenTelemetry handled by observability factory)
if (env.public.otelEnabled) {
  // Prometheus metrics
  const { printMetrics, registerMetrics } = prometheus();
  // Register metrics collection middleware (before other middleware)
  app.use('*', registerMetrics);
  app.get('/metrics', printMetrics);
}

// Global middleware chain
app.use('*', sentryTracingMiddleware());
app.use(requestId());
app.use('*', loggerMiddleware());
app.use('*', sessionMiddleware()); // Sets session if valid
app.use('*', requestContextMiddleware()); // Sets up AsyncLocalStorage for token/requestId

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

app.onError(errorHandler);

// ============================================================================
// API Routes (sub-app with its own middleware + 404 handling)
// ============================================================================
// - Rate limiting per route type (proxy: 30/min, standard: 100/min)
// - Auth guard for all API routes
// - Explicit 404 for unknown endpoints (prevents discovery attacks)
app.route('/api', createApiApp());

// ============================================================================
// Health Check Routes (no auth required)
// ============================================================================

/**
 * Liveness probe - checks if the application is alive
 * Used by K8s to determine if the pod should be restarted
 */
app.get('/_healthz', (c) => c.json({ status: 'ok' }));

app.get('/_readyz', (c) => {
  if (isShuttingDown) return c.json({ status: 'shutting_down' }, 503);
  return c.json({ status: 'ready' });
});

// React Router SSR - must await createHonoServer for production build
// Without await, serverModule.default is a Promise (no .fetch method)
// which causes start.js to skip Bun.serve()
export default await createHonoServer({
  app,

  getLoadContext: (c) => {
    // Values are set by global middleware chain:
    // - sessionMiddleware() sets session
    // - requestContextMiddleware() sets up AsyncLocalStorage for token/requestId
    const requestId = c.get('requestId') ?? crypto.randomUUID();
    const cspNonce = c.get('secureHeadersNonce') ?? '';
    const session = c.get('session');

    // Create request-scoped logger
    const logger = new Logger({
      requestId,
      path: c.req.path,
      method: c.req.method,
    });

    return {
      requestId,
      cspNonce,
      session,
      logger,
    };
  },
});
