import { assistantRoutes } from './assistant';
import { cloudvalidRoutes } from './cloudvalid';
import { fraudStatusRoutes } from './fraud-status';
import { grafanaRoutes } from './grafana';
import { graphqlRoutes } from './graphql';
import { permissionsRoutes } from './permissions';
import { prometheusRoutes } from './prometheus';
import { proxyRoutes } from './proxy';
import { usageRoutes } from './usage';
import { userRoutes } from './user';
import { watchRoutes } from './watch';
import { authGuardMiddleware } from '@/server/middleware/auth';
import { rateLimiter, RateLimitPresets } from '@/server/middleware/rate-limit';
import type { Variables } from '@/server/types';
import { Hono } from 'hono';

/**
 * API sub-application with security middleware and explicit route registration.
 *
 * Middleware order: Auth → Rate Limit → Route Handler
 * Unknown routes return 404 (prevents endpoint discovery attacks)
 */
export function createApiApp() {
  const api = new Hono<{ Variables: Variables }>();

  // Auth required for all API routes
  api.use('*', authGuardMiddleware());

  api.use(
    '*',
    rateLimiter(
      // Only production traffic gets the strict limit. Cypress e2e runs the
      // built server with NODE_ENV=test and can exceed 100 req/min through
      // normal SPA navigation (permission checks, watch streams, prometheus
      // polls) — throttling there starves the UI and fails tests on timeouts.
      process.env.NODE_ENV === 'production'
        ? RateLimitPresets.standard
        : RateLimitPresets.development
    )
  );

  // Routes
  api.route('/fraud-status', fraudStatusRoutes);
  api.route('/proxy', proxyRoutes);
  api.route('/graphql', graphqlRoutes);
  api.route('/cloudvalid', cloudvalidRoutes);
  api.route('/prometheus', prometheusRoutes);
  api.route('/usage', usageRoutes);
  api.route('/grafana', grafanaRoutes);
  api.route('/permissions', permissionsRoutes);
  api.route('/user', userRoutes);
  api.route('/watch', watchRoutes);
  api.use('/assistant/*', rateLimiter(RateLimitPresets.assistant));
  api.route('/assistant', assistantRoutes);

  // 404 for unregistered routes
  api.all('*', (c) =>
    c.json({ code: 'NOT_FOUND', message: 'API endpoint not found', status: 404 }, 404)
  );

  return api;
}
