/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { createControlPlaneClient } from '@/modules/control-plane/control-plane.factory';
import { sessionStorage, SESSION_KEY } from '@/modules/cookie/session.server';
import { createCacheClient } from '@/modules/unstorage/unstorage.js';
import { createRequestHandler } from '@react-router/express';
import compression from 'compression';
import express, { Request, Response } from 'express';
import promBundle from 'express-prom-bundle';
import expressRateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import crypto from 'node:crypto';
import { type ServerBuild } from 'react-router';

const PORT = process.env.PORT || 3000;
const MODE = process.env.NODE_ENV ?? 'development';
const IS_PROD = MODE === 'production';
const IS_DEV = MODE === 'development';

const viteDevServer = IS_PROD
  ? undefined
  : await import('vite').then((vite) =>
      vite.createServer({
        server: { middlewareMode: true },
      })
    );

const app = express();

const metricsMiddleware = promBundle({
  includeMethod: true,
  promClient: {
    collectDefaultMetrics: {},
  },
});
app.use(metricsMiddleware);

/**
 * Disable x-powered-by header for security
 * @see http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
 */
app.disable('x-powered-by');

/**
 * Enable response compression
 */
app.use(compression());

/**
 * Enable request logging
 */
app.use(morgan('tiny'));

/**
 * Generate CSP nonce for each request
 * Implementation based on github.com/epicweb-dev/epic-stack
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
app.use((_, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('hex');
  next();
});

app.use(
  helmet({
    xPoweredBy: false,
    referrerPolicy: { policy: 'same-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      // ❗Important: Remove `reportOnly` to enforce CSP. (Development only).
      reportOnly: true,
      directives: {
        // @ts-expect-error Controls allowed endpoints for fetch, XHR, WebSockets, etc.
        'connect-src': [IS_DEV ? 'ws:' : null, "'self'"].filter(Boolean),
        // Defines which origins can serve fonts to your site.
        'font-src': ["'self'"],
        // Specifies origins allowed to be embedded as frames.
        'frame-src': ["'self'"],
        // Determines allowed sources for images.
        'img-src': ["'self'", 'data:'],
        // Sets restrictions on sources for <script> elements.
        'script-src': [
          "'strict-dynamic'",
          "'self'",
          // @ts-expect-error Dynamic nonce generation requires function callback
          (_, res) => `'nonce-${res.locals.cspNonce}'`,
        ],
        'script-src-attr': [
          // @ts-expect-error Dynamic nonce generation requires function callback
          (_, res) => `'nonce-${res.locals.cspNonce}'`,
        ],
        'upgrade-insecure-requests': null,
      },
    },
  })
);

// We'll use a single proxy to expose the portal
app.set('trust proxy', 1);

/**
 * Clean route paths by removing trailing slashes
 * Improves SEO by preventing duplicate content URLs
 */
app.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const query = req.url.slice(req.path.length);
    const safePath = req.path.slice(0, -1).replace(/\/+/g, '/');
    res.redirect(301, safePath + query);
  } else {
    next();
  }
});

/**
 * Rate limiting configuration
 * Implementation based on github.com/epicweb-dev/epic-stack
 * Disabled in development/test environments
 */
const MAX_LIMIT_MULTIPLE = !IS_DEV ? 10_000 : 1;

const defaultRateLimit = {
  windowMs: 60 * 1000,
  max: 1000 * MAX_LIMIT_MULTIPLE,
  standardHeaders: true,
  legacyHeaders: false,
};

/**
 * Strongest rate limit - 10 requests per minute
 */
const strongestRateLimit = expressRateLimit({
  ...defaultRateLimit,
  windowMs: 60 * 1000,
  max: 10 * MAX_LIMIT_MULTIPLE,
});

/**
 * Strong rate limit - 100 requests per minute
 */
const strongRateLimit = expressRateLimit({
  ...defaultRateLimit,
  windowMs: 60 * 1000,
  max: 100 * MAX_LIMIT_MULTIPLE,
});

/**
 * General rate limit - 1000 requests per minute
 */
const generalRateLimit = expressRateLimit(defaultRateLimit);

/**
 * Apply rate limits based on request path and method
 */
app.use((req, res, next) => {
  const STRONG_PATHS = ['/auth/login'];

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (STRONG_PATHS.some((path) => req.path.includes(path))) {
      return strongestRateLimit(req, res, next);
    }
    return strongRateLimit(req, res, next);
  }

  return generalRateLimit(req, res, next);
});

/**
 * Static asset handling
 */
if (viteDevServer) {
  app.use(viteDevServer.middlewares);
} else {
  // Cache assets for 1 year
  app.use('/assets', express.static('build/client/assets', { immutable: true, maxAge: '1y' }));
  app.use('/fonts', express.static('build/client/fonts', { immutable: true, maxAge: '1y' }));
  app.use('/js', express.static('build/client/js', { immutable: true, maxAge: '1y' }));
  app.use('/images', express.static('build/client/images', { immutable: true, maxAge: '1y' }));
}

/**
 * Cache other static files for 1 hour
 */
app.use(express.static('build/client', { maxAge: '1h' }));

/**
 * Handle 404s for missing image/favicon requests
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
app.get(['/img/*splat', '/favicons/*splat'], (_req: any, res: any) => {
  // if we made it past the express.static for these, then we're missing something.
  // So we'll just send a 404 and won't bother calling other middleware.
  return res.status(404).send('Not found');
});

async function getBuild() {
  try {
    const build = viteDevServer
      ? await viteDevServer.ssrLoadModule('virtual:react-router/server-build')
      : // eslint-disable-next-line import/no-unresolved
        await import('./build/server/index.js');

    return { build: build as unknown as ServerBuild, error: null };
  } catch (error) {
    // Catch error and return null to make express happy and avoid an unrecoverable crash
    console.error('Error creating build:', error);
    return { error: error, build: null as unknown as ServerBuild };
  }
}

async function apiContext(request: Request) {
  const session = await sessionStorage.getSession(request.headers.cookie);
  const sessionData = session.get(SESSION_KEY);

  // Create a general resource client by default
  const controlPlaneClient = createControlPlaneClient(sessionData?.accessToken);

  // Construct the base URLs
  const iamBaseUrl = `${process.env.API_URL}/apis/iam.miloapis.com/v1alpha1/users/${sessionData?.sub}/control-plane`;

  // Create an IAM resource client
  const iamClient = createControlPlaneClient(sessionData?.accessToken, iamBaseUrl);

  return {
    controlPlaneClient,
    iamResourceClient: iamClient,
  };
}

async function cacheContext(request: Request) {
  const session = await sessionStorage.getSession(request.headers.cookie);
  const sessionData = session.get(SESSION_KEY);

  return createCacheClient(sessionData?.sub ?? 'cloud-portal');
}

// Health check endpoints
app.get('/_healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok health' });
});

app.get('/_readyz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok ready' });
});

app.all(
  '{*splat}',
  createRequestHandler({
    getLoadContext: async (req: any, res: any) => ({
      cspNonce: res.locals.cspNonce,
      serverBuild: await getBuild(),
      cache: await cacheContext(req),
      ...(await apiContext(req)),
    }),
    mode: MODE,
    build: async () => {
      const { error, build } = await getBuild();
      // gracefully "catch" the error
      if (error) {
        throw error;
      }
      return build;
    },
  })
);

/**
 * Start the server
 */
app.listen(PORT, () =>
  // eslint-disable-next-line no-console
  console.log(`Express server listening at http://localhost:${PORT}`)
);
