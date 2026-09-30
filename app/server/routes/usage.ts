import type { Variables } from '../types';
import {
  loadOrgUsageDashboard,
  resolveUsageProjectSelection,
} from '@/modules/billing/usage.server';
import { resolveEntitledServiceIds } from '@/modules/entitlements/entitled-services.server';
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

  const projectsList = await createProjectService()
    .list(orgId)
    .catch(() => ({ items: [], hasMore: false, nextCursor: null }));
  const projectNames = projectsList.items.map((project) => project.name);

  // Entitlements are per project. A single selected project scopes the
  // lookup to it; "all" (or an unknown value) unions every project in the org
  // so a service any project can use stays visible in the org-wide view.
  const projectParam = c.req.query('project');
  const selectedProject = resolveUsageProjectSelection(projectParam, projectNames);
  const scopedProjects = selectedProject === 'all' ? projectNames : [selectedProject];
  const entitledServiceIds = await resolveEntitledServiceIds(scopedProjects);

  const dashboard = await loadOrgUsageDashboard(orgId, {
    projectParam,
    cycleParam: c.req.query('cycle'),
    projectNames,
    entitledServiceIds,
  });

  return c.json(dashboard);
});

export { usage as usageRoutes };
