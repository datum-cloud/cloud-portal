// app/server/routes/index.ts
import { authMiddleware } from '../middleware/auth';
import { contextMiddleware } from '../middleware/context';
import type { Variables } from '../types';
import { activityRoutes } from './activity';
import { cloudvalidRoutes } from './cloudvalid';
import { grafanaRoutes } from './grafana';
import { notificationsRoutes } from './notifications';
import { permissionsRoutes } from './permissions';
import { prometheusRoutes } from './prometheus';
import { userRoutes } from './user';
import type { Hono } from 'hono';

export function registerApiRoutes(app: Hono<{ Variables: Variables }>) {
  // CloudValid - requires auth
  app.use('/api/cloudvalid/*', authMiddleware());
  app.route('/api/cloudvalid', cloudvalidRoutes);

  // Prometheus - requires auth
  app.use('/api/prometheus/*', authMiddleware());
  app.route('/api/prometheus', prometheusRoutes);

  // Grafana - requires auth
  app.use('/api/grafana/*', authMiddleware());
  app.route('/api/grafana', grafanaRoutes);

  // Notifications - requires auth
  app.use('/api/notifications/*', authMiddleware());
  app.route('/api/notifications', notificationsRoutes);

  // Activity - requires auth + context
  app.use('/api/activity/*', authMiddleware(), contextMiddleware());
  app.route('/api/activity', activityRoutes);

  // Permissions - requires auth + context
  app.use('/api/permissions/*', authMiddleware(), contextMiddleware());
  app.route('/api/permissions', permissionsRoutes);

  // User - requires auth + context
  app.use('/api/user/*', authMiddleware(), contextMiddleware());
  app.route('/api/user', userRoutes);
}
