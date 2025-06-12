import { API_BASENAME, api } from './routes/api';
import { ORGANIZATIONS_BASENAME, organizations } from './routes/organizations';
import { bunAdapter } from '@/server/adapter/bun';
import { nodeAdapter } from '@/server/adapter/node';
import { env } from '@/utils/config/env.server';
import { otel } from '@hono/otel';
import { prometheus } from '@hono/prometheus';
import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { NONCE, secureHeaders, SecureHeadersVariables } from 'hono/secure-headers';

// Create the Hono app
const app = new Hono<{ Variables: SecureHeadersVariables }>();

// Prometheus metrics & OpenTelemetry
if (env.isOtelEnabled) {
  const { printMetrics, registerMetrics } = prometheus({ collectDefaultMetrics: true });
  app.use('*', registerMetrics);
  app.get('/metrics', printMetrics);
  app.use('*', otel());
}

// Logger
app.use(logger());

// Nonce and secure headers
app.use(
  '*',
  secureHeaders({
    // Equivalent to xPoweredBy: false - Hono doesn't send x-powered-by by default
    xFrameOptions: 'SAMEORIGIN', // Part of frame-src: self
    xContentTypeOptions: 'nosniff',
    referrerPolicy: 'same-origin', // Matches your Helmet config
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      reportTo: env.isDev ? '/' : undefined,
      defaultSrc: ["'self'"],
      connectSrc: ["'self'", ...(env.isDev ? ['ws:'] : []), env.API_URL],
      fontSrc: ["'self'"],
      frameSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      // Allow all script types with nonce
      scriptSrc: ["'strict-dynamic'", "'self'", NONCE],
      // Allow inline scripts with nonce
      scriptSrcElem: ["'strict-dynamic'", "'self'", NONCE],
      // Allow inline event handlers with nonce
      scriptSrcAttr: [NONCE],
      upgradeInsecureRequests: [],
    },
  })
);

// API
app.route(API_BASENAME, api);

// Organizations
app.route(ORGANIZATIONS_BASENAME, organizations);

// Health checks
app.get('/_healthz', (c) => {
  return c.json({ status: 'healthy' });
});

app.get('/_readyz', (c) => {
  return c.json({ status: 'ready' });
});

// DevTools
app.get('/.well-known/appspecific/com.chrome.devtools.json', (c) => {
  return c.json({ message: 'DevTools configuration served!' });
});

export default await (async () => {
  // Force Node runtime for Cypress
  if (env.isCypress) {
    process.env.RUNTIME = 'node';
  }

  // Always use Node for Cypress
  if (env.isCypress || process.env.RUNTIME === 'node') {
    return await nodeAdapter(app);
  }

  // Only try Bun if we're not in Cypress and not explicitly set to Node
  try {
    return await bunAdapter(app);
  } catch {
    return await nodeAdapter(app);
  }
})();
