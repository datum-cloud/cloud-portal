import { assistantChatRoutes } from './assistant-chat';
import { fraudStatusRoutes } from './fraud-status';
import { grafanaRoutes } from './grafana';
import { graphqlRoutes } from './graphql';
import { permissionsRoutes } from './permissions';
import { proxyRoutes } from './proxy';
import { usageRoutes } from './usage';
import { userRoutes } from './user';
import { watchRoutes } from './watch';
import { authGuardMiddleware } from '@/server/middleware/auth';
import { apiBodyLimit } from '@/server/middleware/body-limit';
import { emailVerifiedGuardMiddleware } from '@/server/middleware/email-verification';
import { fetchMetadataGuard } from '@/server/middleware/fetch-metadata';
import { trafficClassLimiter } from '@/server/middleware/rate-limit';
import type { Variables } from '@/server/types';
import { Hono } from 'hono';

/**
 * API sub-application with security middleware and explicit route registration.
 *
 * Middleware order: Auth → Fetch metadata → Traffic class rate limit → Body limit → Route Handler
 * Unknown routes return 404 (prevents endpoint discovery attacks)
 */
export function createApiApp() {
  const api = new Hono<{ Variables: Variables }>();

  // Auth required for all API routes
  api.use('*', authGuardMiddleware());

  // Cross-site POST/PUT/PATCH/DELETE are refused on the browser's own fetch
  // metadata, a second line behind SameSite=Lax cookies. Covers every route
  // below; /api/plugins is mounted outside this sub-app and is GET-only.
  api.use('*', fetchMetadataGuard());

  // Per-user budgets by traffic class, with a ceiling and a penalty box. The
  // profile comes from RATE_LIMIT_PROFILE, else production is `standard` and
  // everything else `development`, whose budgets are effectively unlimited:
  // Cypress runs the built server with NODE_ENV=test and normal SPA
  // navigation would trip real limits and fail on timeouts.
  // See datum-cloud/cloud-portal#1543.
  api.use('*', trafficClassLimiter());

  // 413 above 1 MiB, or 3 MiB on the K8s passthrough (kube-apiserver's own
  // cap). Bodies are buffered before forwarding, so this bounds memory too.
  api.use('*', apiBodyLimit());

  // Endpoints that authenticate with a key the PORTAL holds rather than the
  // caller's token — nothing downstream can tell an unverified signup apart, so
  // the email gate has to be applied here. Every other route below forwards the
  // caller's own access token and is enforced upstream. See
  // middleware/email-verification.ts. No-op while the flag is off.
  const emailVerified = emailVerifiedGuardMiddleware();
  api.use('/assistant/*', emailVerified);

  // Routes
  api.route('/assistant-chat', assistantChatRoutes);
  api.route('/fraud-status', fraudStatusRoutes);
  api.route('/proxy', proxyRoutes);
  api.route('/graphql', graphqlRoutes);
  api.route('/usage', usageRoutes);
  api.route('/grafana', grafanaRoutes);
  api.route('/permissions', permissionsRoutes);
  api.route('/user', userRoutes);
  api.route('/watch', watchRoutes);

  // 404 for unregistered routes
  api.all('*', (c) =>
    c.json({ code: 'NOT_FOUND', message: 'API endpoint not found', status: 404 }, 404)
  );

  return api;
}
