import type { Organization } from './organization.schema';
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
