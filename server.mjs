/**
 * @file Express server setup and configuration
 * @description Main server file that configures Express with security, performance and routing middleware
 */

import { createRequestHandler } from '@remix-run/express'
import { installGlobals } from '@remix-run/node'
import crypto from 'crypto' // For generating CSP nonces
import express from 'express' // Web framework
import compression from 'compression' // Response compression
import morgan from 'morgan' // HTTP request logger
import helmet from 'helmet' // Security headers
import rateLimit from 'express-rate-limit' // Rate limiting

/**
 * Enable single fetch functionality for Remix
 * @see https://remix.run/docs/en/main/guides/single-fetch#enabling-single-fetch
 */
installGlobals({ nativeFetch: true })

/**
 * Server configuration
 */
const PORT = process.env.PORT || 3000
const NODE_ENV = process.env.NODE_ENV ?? 'development'

/**
 * Configure Vite dev server in development
 * @type {import('vite').ViteDevServer|undefined}
 */
const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? undefined
    : await import('vite').then((vite) =>
        vite.createServer({
          server: { middlewareMode: true },
        }),
      )

const app = express()

/**
 * Disable x-powered-by header for security
 * @see http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
 */
app.disable('x-powered-by')

/**
 * Enable response compression
 */
app.use(compression())

/**
 * Enable request logging
 */
app.use(morgan('tiny'))

/**
 * Generate CSP nonce for each request
 * Implementation based on github.com/epicweb-dev/epic-stack
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
 */
app.use((_, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('hex')
  next()
})

/**
 * Configure security headers with Helmet
 */
app.use(
  helmet({
    contentSecurityPolicy: {
      referrerPolicy: { policy: 'same-origin' },
      crossOriginEmbedderPolicy: false,
      // ❗Important: Remove `reportOnly` to enforce CSP. (Development only).
      reportOnly: true,
      directives: {
        // Controls allowed endpoints for fetch, XHR, WebSockets, etc.
        'connect-src': [NODE_ENV === 'development' ? 'ws:' : null, "'self'"].filter(
          Boolean,
        ),
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
          (_, res) => `'nonce-${res.locals.cspNonce}'`,
        ],
        // Controls allowed sources for inline JavaScript event handlers.
        'script-src-attr': [(_, res) => `'nonce-${res.locals.cspNonce}'`],
        // Enforces that requests are made over HTTPS.
        'upgrade-insecure-requests': null,
      },
    },
  }),
)

/**
 * Clean route paths by removing trailing slashes
 * Improves SEO by preventing duplicate content URLs
 */
app.use((req, res, next) => {
  if (req.path.endsWith('/') && req.path.length > 1) {
    const query = req.url.slice(req.path.length)
    const safePath = req.path.slice(0, -1).replace(/\/+/g, '/')
    res.redirect(301, safePath + query)
  } else {
    next()
  }
})

/**
 * Rate limiting configuration
 * Implementation based on github.com/epicweb-dev/epic-stack
 * Disabled in development/test environments
 */
const MAX_LIMIT_MULTIPLE = NODE_ENV !== 'production' ? 10_000 : 1

const defaultRateLimit = {
  windowMs: 60 * 1000,
  max: 1000 * MAX_LIMIT_MULTIPLE,
  standardHeaders: true,
  legacyHeaders: false,
}

/**
 * Strongest rate limit - 10 requests per minute
 */
const strongestRateLimit = rateLimit({
  ...defaultRateLimit,
  windowMs: 60 * 1000,
  max: 10 * MAX_LIMIT_MULTIPLE,
})

/**
 * Strong rate limit - 100 requests per minute
 */
const strongRateLimit = rateLimit({
  ...defaultRateLimit,
  windowMs: 60 * 1000,
  max: 100 * MAX_LIMIT_MULTIPLE,
})

// We'll use a single proxy to expose the portal
app.set('trust proxy', 1)

/**
 * General rate limit - 1000 requests per minute
 */
const generalRateLimit = rateLimit(defaultRateLimit)

/**
 * Apply rate limits based on request path and method
 */
app.use((req, res, next) => {
  const STRONG_PATHS = ['/auth/login']

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    if (STRONG_PATHS.some((path) => req.path.includes(path))) {
      return strongestRateLimit(req, res, next)
    }
    return strongRateLimit(req, res, next)
  }

  return generalRateLimit(req, res, next)
})

/**
 * Static asset handling
 */
if (viteDevServer) {
  app.use(viteDevServer.middlewares)
} else {
  // Cache assets for 1 year
  app.use(
    '/assets',
    express.static('build/client/assets', { immutable: true, maxAge: '1y' }),
  )
}

/**
 * Cache other static files for 1 hour
 */
app.use(express.static('build/client', { maxAge: '1h' }))

/**
 * Handle 404s for missing image/favicon requests
 */
app.get(['/img/*', '/favicons/*'], (req, res) => {
  return res.status(404).send('Not found')
})

/**
 * Handle server-side rendering with Remix
 */
app.all(
  '*',
  createRequestHandler({
    getLoadContext: (_, res) => ({
      cspNonce: res.locals.cspNonce,
    }),

    build: viteDevServer
      ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
      : await import('./build/server/index.js'),
  }),
)

/**
 * Start the server
 */
app.listen(PORT, () =>
  console.log(`Express server listening at http://localhost:${PORT}`),
)
