import type { Variables } from '../types';
import { loadOrgUsageDashboard } from '@/modules/billing/usage.server';
import { FeatureFlag } from '@/modules/feature-flags';
import { isFeatureEnabled } from '@/modules/feature-flags/evaluate.server';
import { createProjectService } from '@/resources/projects';
import { Hono } from 'hono';

const usage = new Hono<{ Variables: Variables }>();

/**
 * GET /api/usage?orgId=&project=&cycle=
 *
 * Client-facing usage dashboard payload. Amberflo credentials stay
 * server-side; the org usage page hydrates via React Query.
 */
usage.get('/', async (c) => {
  const orgId = c.req.query('orgId');
  if (!orgId) {
    return c.json({ message: 'orgId is required' }, 400);
  }

  const enabled = await isFeatureEnabled(FeatureFlag.UsageMeteringDashboard, orgId);
  if (!enabled) {
    return c.json({ message: 'Usage metering is not enabled for this organization' }, 404);
  }

  const projectsList = await createProjectService()
    .list(orgId)
    .catch(() => ({ items: [], hasMore: false, nextCursor: null }));
  const projectNames = projectsList.items.map((project) => project.name);

  const dashboard = await loadOrgUsageDashboard(orgId, {
    projectParam: c.req.query('project'),
    cycleParam: c.req.query('cycle'),
    projectNames,
  });

  return c.json(dashboard);
});

export { usage as usageRoutes };
