import type { Organization, OrganizationList } from './organization.schema';
import {
  createOrganizationService,
  toOrganizationList,
  type MembershipPage,
} from './organization.service';
import { getRequestContext, oncePerRequest } from '@/modules/axios/request-context';
import { requestCacheKeys } from '@/utils/request-cache-keys';

/**
 * Fetch an organization once per request.
 *
 * The org setup pre-check (`loadOrgSetupInputs`, run from
 * `orgLegacySetupMiddleware`) and the org detail layout loader each fetch the
 * same organization, one after the other. Org-scope sibling of
 * `getProjectForRequest` — see that file for the rationale and the
 * `RequestContext.cachedUser` precedent it follows.
 *
 * Deliberately NOT re-exported from `app/resources/organizations/index.ts` —
 * that barrel is imported by client-side query and watch hooks, and
 * `request-context.ts` pulls in `async_hooks`.
 */
export async function getOrganizationForRequest(orgId: string): Promise<Organization> {
  const ctx = getRequestContext();
  if (ctx?.cachedOrganization?.name === orgId) {
    return ctx.cachedOrganization;
  }

  const organization = await oncePerRequest(requestCacheKeys.organization(orgId), () =>
    createOrganizationService().get(orgId)
  );
  if (ctx) {
    ctx.cachedOrganization = organization;
  }
  return organization;
}

/**
 * List the caller's memberships once per request.
 *
 * The org list, the "any orgs?" probe and the ownership checks are all views
 * of this one call. Before they shared it, a single page load listed the
 * same memberships up to four times: the auth middleware's probe, the private
 * layout, its owner check and the project or org layout's owner check.
 *
 * Not for code that polls for a membership to change
 * (`waitForMembershipRolesApplied`): that needs a fresh read every time.
 */
export function listMembershipsForRequest(): Promise<MembershipPage> {
  return oncePerRequest(requestCacheKeys.memberships, () =>
    createOrganizationService().fetchMembershipPage()
  );
}

/**
 * The caller's organizations, mapped from the shared membership list. Not
 * keyed itself: callers join `requestCacheKeys.allOrganizations` through
 * `listOrganizationsForRequest`, or authMiddleware, which injects its lister.
 */
export async function organizationsFromMemberships(): Promise<OrganizationList> {
  return toOrganizationList(await listMembershipsForRequest());
}

/**
 * List the caller's organizations once per request. React Router runs every
 * matched loader concurrently on a document request, so callers share the
 * in-flight promise and the same result object.
 */
export function listOrganizationsForRequest(): Promise<OrganizationList> {
  return oncePerRequest(requestCacheKeys.allOrganizations, organizationsFromMemberships);
}

/** Whether the caller belongs to at least one organization, from the shared list. */
export async function hasOrganizationsForRequest(): Promise<boolean> {
  return (await listOrganizationsForRequest()).items.length > 0;
}
