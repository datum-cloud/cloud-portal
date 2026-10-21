import type { Variables } from '../types';
import { filterUsageByEntitlement } from '@/modules/billing/usage-entitlements';
import {
  loadOrgUsageDashboard,
  resolveUsageProjectSelection,
} from '@/modules/billing/usage.server';
import { resolveEntitledServiceIds } from '@/modules/entitlements/entitled-services.server';
import { createProjectService } from '@/resources/projects';
import { Hono } from 'hono';

const usage = new Hono<{ Variables: Variables }>();

/** Organization and project names are DNS-1123 labels. */
const RESOURCE_NAME = /^[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?$/;

/**
 * GET /api/usage?orgId=&project=&cycle=&scope=
 *
 * Client-facing usage dashboard payload; the usage pages hydrate via React
 * Query. `scope=project` reads in the project's own context, so `project`
 * must name it; otherwise usage is read in the organization's context.
 */
usage.get('/', async (c) => {
  // Both names end up in the control-plane URL path, so anything that is
  // not a plain resource name (e.g. `x/../..`) is rejected outright.
  const orgId = c.req.query('orgId');
  if (!orgId || !RESOURCE_NAME.test(orgId)) {
    return c.json({ message: 'orgId must be an organization name' }, 400);
  }

  const projectParam = c.req.query('project');
  const isProjectScope = c.req.query('scope') === 'project';

  // Project scope reads only its own project, so there is no org-wide
  // project list to validate against or union entitlements over.
  let selectedProject: string;
  let projectNames: string[] = [];
  if (isProjectScope) {
    if (!projectParam || projectParam === 'all' || !RESOURCE_NAME.test(projectParam)) {
      return c.json({ message: 'project must be a project name for project scope' }, 400);
    }
    selectedProject = projectParam;
  } else {
    const projectsList = await createProjectService()
      .list(orgId)
      .catch(() => ({ items: [], hasMore: false, nextCursor: null }));
    projectNames = projectsList.items.map((project) => project.name);
    selectedProject = resolveUsageProjectSelection(projectParam, projectNames);
  }

  // Entitlements are per project. A single selected project scopes the
  // lookup to it; "all" unions every project in the org so a service any
  // project can use stays visible in the org-wide view. They don't depend
  // on the usage, so both load at once.
  const scopedProjects = selectedProject === 'all' ? projectNames : [selectedProject];
  const [entitledServiceIds, dashboard] = await Promise.all([
    resolveEntitledServiceIds(scopedProjects),
    loadOrgUsageDashboard(orgId, {
      selectedProject,
      cycleParam: c.req.query('cycle'),
      scope: isProjectScope ? 'project' : 'organization',
    }),
  ]);

  return c.json({
    ...dashboard,
    usage: filterUsageByEntitlement(dashboard.usage, entitledServiceIds),
  });
});

export { usage as usageRoutes };
