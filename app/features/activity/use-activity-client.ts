import {
  createActivityClientConfig,
  getOrganizationControlPlanePath,
  getProjectControlPlanePath,
  getUserControlPlanePath,
} from './activity-client';
import {
  createOrgResourceLinkResolver,
  createResourceLinkResolver,
} from './activity-link-resolvers';
import { useApp } from '@/providers/app.provider';
import { useProjectContext } from '@/providers/project.provider';
import {
  ActivityApiClient,
  defaultResourceLinkResolver,
  type ResourceLinkResolver,
} from '@datum-cloud/activity-ui';
import { useMemo } from 'react';
import { useParams } from 'react-router';

interface ActivityClientBundle {
  client: ActivityApiClient;
  resourceLinkResolver: ResourceLinkResolver;
}

/**
 * Bundle a project-scoped Activity API client with a resource link resolver.
 *
 * The client is configured to hit /api/proxy{controlPlanePath} where the
 * control-plane path resolves to the active project. The link resolver
 * builds /project/:projectId/... URLs for activity items so they can be
 * rendered as clickable references back to their detail pages.
 *
 * Reads the active project from `useProjectContext()` and falls back to the
 * `:projectId` URL param when the context hasn't hydrated yet.
 */
export function useProjectActivityClient(): ActivityClientBundle {
  const { project } = useProjectContext();
  const { projectId } = useParams();

  const client = useMemo(() => {
    const projectName = project?.name ?? projectId ?? '';
    return new ActivityApiClient(
      createActivityClientConfig(getProjectControlPlanePath(projectName))
    );
  }, [project?.name, projectId]);

  const resourceLinkResolver = useMemo(
    () => createResourceLinkResolver(projectId ?? ''),
    [projectId]
  );

  return { client, resourceLinkResolver };
}

/**
 * Bundle an organization-scoped Activity API client with a resource link
 * resolver.
 *
 * Reads the active organization from `useApp()` (cloud-portal's app context
 * exposes the current organization directly — there is no separate org
 * provider) and falls back to the `:orgId` URL param when the context
 * hasn't hydrated yet.
 *
 * The link resolver only routes `Project` references back into the portal;
 * other org-scoped kinds render as plain text. See
 * `createOrgResourceLinkResolver` for details.
 */
export function useOrgActivityClient(): ActivityClientBundle {
  const { organization } = useApp();
  const { orgId } = useParams();

  const client = useMemo(() => {
    const orgName = organization?.name ?? orgId ?? '';
    return new ActivityApiClient(
      createActivityClientConfig(getOrganizationControlPlanePath(orgName))
    );
  }, [organization?.name, orgId]);

  const resourceLinkResolver = useMemo(() => createOrgResourceLinkResolver(orgId ?? ''), [orgId]);

  return { client, resourceLinkResolver };
}

/**
 * Bundle a user-scoped Activity API client with the activity-ui default
 * resource link resolver.
 *
 * The user-scope is identity-tenant — the upstream Activity API filters by
 * `user_uid` regardless of which org/project the activity happened in. Reads
 * the user's `sub` claim from `useApp()`.
 *
 * Falls back to activity-ui's default resource link resolver since user-scope
 * activity may include cross-tenant references that cloud-portal can't always
 * route back to a specific detail page.
 */
export function useUserActivityClient(): ActivityClientBundle {
  const { user } = useApp();

  const client = useMemo(() => {
    const userId = user?.sub ?? '';
    return new ActivityApiClient(createActivityClientConfig(getUserControlPlanePath(userId)));
  }, [user?.sub]);

  const resourceLinkResolver = useMemo(() => defaultResourceLinkResolver, []);

  return { client, resourceLinkResolver };
}
