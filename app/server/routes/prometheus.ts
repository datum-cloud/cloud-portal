// app/server/routes/prometheus.ts
import type { Variables } from '../types';
import { PrometheusService } from '@/modules/prometheus';
import { PrometheusError } from '@/modules/prometheus/errors';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

const prometheus = new Hono<{ Variables: Variables }>();

// Health check
prometheus.get('/', (c) => {
  return c.json({
    configured: true,
    url: new URL(env.server.prometheusUrl).origin,
  });
});

// Query endpoint
prometheus.post('/', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const prometheusService = new PrometheusService({
      baseURL: env.server.prometheusUrl,
      timeout: 30000,
      retries: 1,
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    const body = await c.req.json();
    const result = await prometheusService.handleAPIRequest(body);

    return c.json({ success: true, data: result });
  } catch (error) {
    console.error('Prometheus API error:', error);
    if (error instanceof PrometheusError) {
      return c.json(
        { error: error.message, type: error.type, details: error.details },
        (error.statusCode ?? 500) as 400 | 401 | 500
      );
    }
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export { prometheus as prometheusRoutes };
