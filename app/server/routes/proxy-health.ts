// app/server/routes/proxy-health.ts
import type { Variables } from '../types';
import { Hono } from 'hono';

const proxyHealth = new Hono<{ Variables: Variables }>();

proxyHealth.get('/check', async (c) => {
  try {
    const hostname = c.req.query('hostname');

    if (!hostname) {
      return c.json({ error: 'hostname query parameter is required' }, 400);
    }

    const startTime = Date.now();
    const url = hostname.startsWith('http') ? hostname : `https://${hostname}`;
    const timeout = 5000; // 5 seconds

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        cache: 'no-cache',
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      return c.json({
        success: response.ok,
        statusCode: response.status,
        latency,
        timestamp: new Date().toISOString(),
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);

      // If it's an abort (timeout), that's a clear failure
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return c.json(
          {
            success: false,
            error: `Request timed out after ${timeout}ms`,
            latency: timeout,
            timestamp: new Date().toISOString(),
          },
          504
        );
      }

      // Network error or other failure
      const latency = Date.now() - startTime;
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Connection failed';

      return c.json(
        {
          success: false,
          error: errorMessage,
          latency,
          timestamp: new Date().toISOString(),
        },
        502
      );
    }
  } catch (error) {
    console.error('[Proxy Health Check API Error]', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ success: false, error: errorMessage }, 500);
  }
});

export { proxyHealth as proxyHealthRoutes };
