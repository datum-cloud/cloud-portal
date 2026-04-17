import { assistantRoutes } from './assistant';
import { cloudvalidRoutes } from './cloudvalid';
import { fraudStatusRoutes } from './fraud-status';
import { grafanaRoutes } from './grafana';
import { graphqlRoutes } from './graphql';
import { permissionsRoutes } from './permissions';
import { prometheusRoutes } from './prometheus';
import { proxyRoutes } from './proxy';
import { createTerminalRoutes } from './terminal';
import { userRoutes } from './user';
import { watchRoutes } from './watch';
import { authGuardMiddleware } from '@/server/middleware/auth';
import { rateLimiter, RateLimitPresets } from '@/server/middleware/rate-limit';
import type { Variables } from '@/server/types';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';
import type { UpgradeWebSocket } from 'hono/ws';

interface CreateApiAppOptions {
  /**
   * When provided, mounts the embedded `datumctl` terminal at /api/terminal.
   * Supplied by the `configure` callback in `createHonoServer({ useWebSocket })`
   * so that the same factory works under both the Bun runtime (production) and
   * Vite's Node-based dev server.
   */
  upgradeWebSocket?: UpgradeWebSocket;
}

/**
 * API sub-application with security middleware and explicit route registration.
 *
 * Middleware order: Auth → Rate Limit → Route Handler
 * Unknown routes return 404 (prevents endpoint discovery attacks)
 */
export function createApiApp({ upgradeWebSocket }: CreateApiAppOptions = {}) {
  const api = new Hono<{ Variables: Variables }>();

  // Auth required for all API routes
  api.use('*', authGuardMiddleware());

  // Dedicated rate-limit bucket for the embedded terminal. Sits BEFORE the
  // catch-all limiter so its tighter cap wins for /terminal/*. Only the WS
  // upgrade handshake flows through HTTP; everything else (commands, file
  // uploads) rides inside the open socket and is bounded by the in-socket
  // protocol (single in-flight exec, output cap, idle timeout, upload
  // size + concurrency + stall timeouts).
  api.use('/terminal/*', rateLimiter(RateLimitPresets.terminal));

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

  // Embedded datumctl terminal. Only mounted when both the runtime adapter
  // supplied an `upgradeWebSocket` helper AND the deployment has DATUMCTL_BIN
  // configured. Absent either, the UI's probe request gets a clean 404.
  if (upgradeWebSocket && env.server.datumctlBin) {
    api.route('/terminal', createTerminalRoutes(upgradeWebSocket));
  }

  // 404 for unregistered routes
  api.all('*', (c) =>
    c.json({ code: 'NOT_FOUND', message: 'API endpoint not found', status: 404 }, 404)
  );

  return api;
}
