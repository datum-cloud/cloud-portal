import { deriveQuotaVerdict } from './derive-quota-verdict';
import type { QuotaScope, QuotaVerdict } from './types';
import { usePermissions } from '@/modules/rbac';
import { useAllowanceBuckets } from '@/resources/allowance-buckets';
import { useResourceRegistrations } from '@/resources/resource-registrations';
import { useMemo } from 'react';

export function useResourceQuota(input: {
  resource: string;
  group: string;
  scope: QuotaScope;
}): QuotaVerdict {
  const { organizationId, projectId } = usePermissions();
  const serviceScope = input.scope === 'org' ? ('organization' as const) : ('project' as const);
  const scopeId = (input.scope === 'org' ? organizationId : projectId) ?? '';
  const buckets = useAllowanceBuckets(serviceScope, scopeId, { enabled: !!scopeId });
  const registrations = useResourceRegistrations(serviceScope, scopeId, { enabled: !!scopeId });
  const resourceType = `${input.group}/${input.resource}`;

  return useMemo(() => {
    const derived = deriveQuotaVerdict({
      resourceType,
      buckets: buckets.data,
      registrations: registrations.data,
      isError: buckets.isError,
    });
    // isPending (not isLoading): a disabled query must read as "still resolving", never as a verdict.
    return { ...derived, isLoading: buckets.isPending };
  }, [resourceType, buckets.data, buckets.isError, buckets.isPending, registrations.data]);
}
