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
 * GET /api/usage?orgId=&project=&cycle=&scope=
 *
 * Client-facing usage dashboard payload; the usage pages hydrate via React
 * Query. `scope=project` reads in the project's own context, so `project`
 * must name it; otherwise usage is read in the organization's context.
 */
usage.get('/', async (c) => {
  const orgId = c.req.query('orgId');
  if (!orgId) {
    return c.json({ message: 'orgId is required' }, 400);
  }

  const projectParam = c.req.query('project');
  const isProjectScope = c.req.query('scope') === 'project';
  if (isProjectScope && (!projectParam || projectParam === 'all')) {
    return c.json({ message: 'project is required for project scope' }, 400);
  }

  // Project scope reads only its own project, so there is no org-wide
  // project list to validate against or union entitlements over.
  let projectNames: string[] = [];
  let scopedProjects: string[];
  if (isProjectScope) {
    scopedProjects = [projectParam!];
  } else {
    const projectsList = await createProjectService()
      .list(orgId)
      .catch(() => ({ items: [], hasMore: false, nextCursor: null }));
    projectNames = projectsList.items.map((project) => project.name);

    // Entitlements are per project. A single selected project scopes the
    // lookup to it; "all" (or an unknown value) unions every project in the
    // org so a service any project can use stays visible in the org-wide view.
    const selectedProject = resolveUsageProjectSelection(projectParam, projectNames);
    scopedProjects = selectedProject === 'all' ? projectNames : [selectedProject];
  }
  const entitledServiceIds = await resolveEntitledServiceIds(scopedProjects);

  const dashboard = await loadOrgUsageDashboard(orgId, {
    projectParam,
    cycleParam: c.req.query('cycle'),
    projectNames,
    scope: isProjectScope ? 'project' : 'organization',
    entitledServiceIds,
  });

  return c.json(dashboard);
});

export { usage as usageRoutes };
