import { activityRoutes } from './activity';
import { cloudvalidRoutes } from './cloudvalid';
import { grafanaRoutes } from './grafana';
import { graphqlRoutes } from './graphql';
import { notificationsRoutes } from './notifications';
import { permissionsRoutes } from './permissions';
import { prometheusRoutes } from './prometheus';
import { proxyRoutes } from './proxy';
import { userRoutes } from './user';
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
      process.env.NODE_ENV === 'development'
        ? RateLimitPresets.development
        : RateLimitPresets.standard
    )
  );

  // Routes
  api.route('/proxy', proxyRoutes);
  api.route('/graphql', graphqlRoutes);
  api.route('/cloudvalid', cloudvalidRoutes);
  api.route('/prometheus', prometheusRoutes);
  api.route('/grafana', grafanaRoutes);
  api.route('/notifications', notificationsRoutes);
  api.route('/activity', activityRoutes);
  api.route('/permissions', permissionsRoutes);
  api.route('/user', userRoutes);

  // 404 for unregistered routes
  api.all('*', (c) =>
    c.json({ code: 'NOT_FOUND', message: 'API endpoint not found', status: 404 }, 404)
  );

  return api;
}
