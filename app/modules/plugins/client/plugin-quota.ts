/**
 * Pure logic behind the SDK's quota bindings (see plugin-sdk-bindings.tsx),
 * kept separate so it can be tested without a DOM.
 */
import { buildQuotaIncreaseRequest } from '@/modules/quota/build-quota-increase-request';
import { formatQuotaDeniedReason } from '@/modules/quota/derive-quota-verdict';
import type { QuotaVerdict } from '@/modules/quota/types';
import type {
  PluginOrganization,
  PluginProject,
  QuotaIncreaseRequest,
  ResourceQuotaVerdict,
} from '@datum-cloud/portal-plugin-sdk';

/**
 * Maps the portal's verdict onto the SDK contract. Same rules as portal pages,
 * with two differences: `bucket`, `registration` and `hasQuota` are
 * portal-internal and dropped, and `deniedReason` leaves out the portal's
 * "Settings → Quotas" pointer, because a plugin offers its own request action.
 */
export function toPluginQuotaVerdict(
  verdict: Omit<QuotaVerdict, 'isLoading'>,
  input: { resourceType: string; isLoading: boolean }
): ResourceQuotaVerdict {
  const { denied, allocated, limit } = verdict;
  return {
    isLoading: input.isLoading,
    isUnknown: verdict.isUnknown,
    denied,
    deniedReason:
      denied && allocated !== undefined && limit !== undefined
        ? formatQuotaDeniedReason({
            label: verdict.registration?.displayName ?? input.resourceType,
            allocated,
            limit,
          })
        : undefined,
    limit,
    allocated,
    available: verdict.available,
  };
}

/** The same HelpScout prefill the portal's Quotas table opens, for the request's scope. */
export function buildPluginQuotaIncreaseRequest(
  request: QuotaIncreaseRequest,
  current: { project?: PluginProject; org?: PluginOrganization }
) {
  const target = request.scope === 'organization' ? current.org : current.project;
  return buildQuotaIncreaseRequest(request.resourceType, {
    scope: request.scope,
    name: target?.name,
    displayName: target?.displayName,
    context: request.context,
  });
}
