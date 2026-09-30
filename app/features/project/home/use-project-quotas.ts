import { topQuotas, type QuotaItem } from './home.helpers';
import { useActiveServiceEntitlements } from '@/modules/plugins/client/use-active-service-entitlements';
import { useAllowanceBuckets } from '@/resources/allowance-buckets';
import { useResourceRegistrations } from '@/resources/resource-registrations';

/**
 * Every quota the project can see, fullest first, for the home page's Quotas
 * column and health bar. Gated services the project isn't entitled to are
 * left out, as on the Quotas page.
 */
export function useProjectQuotas(projectId: string): {
  quotas: QuotaItem[];
  isLoading: boolean;
  isError: boolean;
} {
  const buckets = useAllowanceBuckets('project', projectId);
  // Registrations only add display names, owners and Feature flags, so a
  // failed fetch falls back to raw resource types rather than failing.
  const registrations = useResourceRegistrations('project', projectId);
  const entitlements = useActiveServiceEntitlements(projectId);

  return {
    quotas: topQuotas(
      buckets.data ?? [],
      registrations.data ?? [],
      // Unknown entitlements hide nothing, like the server-side filter.
      entitlements.data ? new Set(entitlements.data) : null,
      Infinity
    ),
    isLoading: buckets.isLoading || registrations.isLoading || entitlements.isLoading,
    isError: buckets.isError,
  };
}
