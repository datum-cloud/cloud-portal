import type { QuotaScope } from '../types';
import { usePermissions } from '@/modules/rbac';
import { useAllowanceBucketsWatch } from '@/resources/allowance-buckets';

/** Mounts the bucket watch once per scope; guards are pure cache readers.
 *  Watch failure (missing verb / stream down) degrades to query staleness. */
export function QuotaWatchBridge({ scope }: { scope: QuotaScope }) {
  const { organizationId, projectId } = usePermissions();
  const id = (scope === 'org' ? organizationId : projectId) ?? '';
  useAllowanceBucketsWatch(scope === 'org' ? 'organization' : 'project', id, { enabled: !!id });
  return null;
}
