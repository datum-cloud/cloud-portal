import { createOrganizationService } from '@/resources/organizations/organization.service';
import { createProjectService } from '@/resources/projects/project.service';
import type { Variables } from '../types';
import { paths } from '@/utils/config/paths.config';
import { setOrgSession } from '@/utils/cookies/org.server';
import { setProjectSession } from '@/utils/cookies/project.server';
import { combineHeaders, getPathWithParams } from '@/utils/helpers/path.helper';
import { Hono } from 'hono';

const onboardingRedirect = new Hono<{ Variables: Variables }>();

/**
 * GET /api/onboarding-redirect
 *
 * After fraud verification passes for a new user, resolve their personal org
 * and first project, set session cookies, and redirect directly to the project
 * home page — skipping the org/project selection hierarchy.
 *
 * Falls back progressively:
 *   project found  → /project/[id]/home  (with org + project cookies set)
 *   org only       → /org/[id]/projects  (with org cookie set)
 *   nothing        → /account/organizations
 */
onboardingRedirect.get('/', async (c) => {
  try {
    const orgList = await createOrganizationService().list();
    const personalOrg = orgList.items.find((org) => org.type === 'Personal');

    if (!personalOrg) {
      return c.redirect(paths.account.organizations.root, 302);
    }

    const projectList = await createProjectService().list(personalOrg.name);
    const firstProject = projectList.items[0];

    if (!firstProject) {
      const orgResult = await setOrgSession(c.req.raw, personalOrg.name);
      const destination = getPathWithParams(paths.org.detail.projects.root, {
        orgId: personalOrg.name,
      });
      const headers = new Headers(orgResult.headers);
      headers.set('Location', destination);
      return new Response(null, { status: 302, headers });
    }

    const [orgResult, projectResult] = await Promise.all([
      setOrgSession(c.req.raw, personalOrg.name),
      setProjectSession(c.req.raw, firstProject.name),
    ]);

    const destination = getPathWithParams(paths.project.detail.home, {
      projectId: firstProject.name,
    });
    const headers = combineHeaders(orgResult.headers, projectResult.headers);
    headers.set('Location', destination);
    return new Response(null, { status: 302, headers });
  } catch {
    return c.redirect(paths.account.organizations.root, 302);
  }
});

export { onboardingRedirect as onboardingRedirectRoutes };
