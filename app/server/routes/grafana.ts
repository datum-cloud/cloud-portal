// app/server/routes/grafana.ts
import type { Variables } from '../types';
import { env } from '@/utils/env/env.server';
import { Hono } from 'hono';

const grafana = new Hono<{ Variables: Variables }>();

grafana.get('/test-connection', async (c) => {
  try {
    const session = c.get('session');
    if (!session?.accessToken) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const grafanaUrl = env.server.grafanaUrl;
    if (!grafanaUrl) {
      return c.json({ configured: false });
    }

    const response = await fetch(`${grafanaUrl}/api/health`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });

    return c.json({
      configured: true,
      connected: response.ok,
      status: response.status,
    });
  } catch (error) {
    console.error(
      'Grafana connection error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return c.json({ configured: true, connected: false, error: 'Connection failed' }, 503);
  }
});

export { grafana as grafanaRoutes };
