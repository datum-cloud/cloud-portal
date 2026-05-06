import { assistantRoutes } from './assistant';
import { cloudvalidRoutes } from './cloudvalid';
import { fraudStatusRoutes } from './fraud-status';
import { grafanaRoutes } from './grafana';
import { graphqlRoutes } from './graphql';
import { permissionsRoutes } from './permissions';
import { prometheusRoutes } from './prometheus';
import { proxyRoutes } from './proxy';
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
      process.env.NODE_ENV === 'development'
        ? RateLimitPresets.development
        : RateLimitPresets.standard
    )
  );

  // Routes
  api.route('/fraud-status', fraudStatusRoutes);
  api.route('/proxy', proxyRoutes);
  api.route('/graphql', graphqlRoutes);
  api.route('/cloudvalid', cloudvalidRoutes);
  api.route('/prometheus', prometheusRoutes);
  api.route('/grafana', grafanaRoutes);
  api.route('/permissions', permissionsRoutes);
  api.route('/user', userRoutes);
  api.route('/watch', watchRoutes);
  api.use('/assistant/*', rateLimiter(RateLimitPresets.assistant));
  api.route('/assistant', assistantRoutes);

  // Image upload: accept a multipart file, return a base64 data URL.
  // Used by the markdown editor's image-paste handler in support ticket replies.
  api.post('/uploads/image', async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body['file'];
      if (!file || typeof file === 'string') {
        return c.json({ error: 'No file provided' }, 400);
      }
      const buf = await (file as File).arrayBuffer();
      const b64 = Buffer.from(buf).toString('base64');
      const mime = (file as File).type || 'image/png';
      return c.json({ url: `data:${mime};base64,${b64}` });
    } catch {
      return c.json({ error: 'Upload failed' }, 500);
    }
  });

  // 404 for unregistered routes
  api.all('*', (c) =>
    c.json({ code: 'NOT_FOUND', message: 'API endpoint not found', status: 404 }, 404)
  );

  return api;
}
