import { recordActivity } from '@/server/observability/engagement-metrics';
import type { Variables } from '@/server/types';
import { createMiddleware } from 'hono/factory';

/**
 * Feeds the active users/orgs/projects gauges. Records before `next()` and
 * never awaits the store, so it adds no latency to the request.
 * Must run AFTER sessionMiddleware.
 */
export function engagementMiddleware() {
  return createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const sub = c.get('session')?.sub;
    if (sub) recordActivity(sub, c.req.path);
    await next();
  });
}
