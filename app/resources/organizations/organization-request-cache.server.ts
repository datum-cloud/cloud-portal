import type { Organization, OrganizationList } from './organization.schema';
import { createOrganizationService } from './organization.service';
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
 * List the caller's organizations once per request.
 *
 * The private layout reads the list to resolve root feature flags and the
 * /account/organizations loader reads it to render the rows. React Router runs
 * both loaders concurrently on a document request, so without a shared
 * in-flight promise each would issue its own membership list.
 */
export function listOrganizationsForRequest(): Promise<OrganizationList> {
  return oncePerRequest(requestCacheKeys.allOrganizations, () =>
    createOrganizationService().list()
  );
}
