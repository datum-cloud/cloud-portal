import { QuotasTable } from '@/features/quotas/quotas-table';
import { useGuardedRouteData } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import type { Organization } from '@/resources/organizations';
import { buildOrganizationNamespace } from '@/utils/common';
import { type LoaderFunctionArgs } from 'react-router';

const route = defineResourceRoute<AllowanceBucket[]>({
  type: 'list',
  resource: 'allowancebuckets',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view quotas.",
  metaTitle: 'Quotas',
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<AllowanceBucket[]>(args, {
    resource: 'allowancebuckets',
    group: 'quota.miloapis.com',
    scope: 'org',
    namespace: buildOrganizationNamespace(args.params.orgId!),
    fetch: ({ orgId }) => createAllowanceBucketService().list('organization', orgId!),
  });
export const meta = route.meta;

export const handle = {
  breadcrumb: () => <span>Quotas</span>,
};

export default route.Page(({ data: allowanceBuckets }) => {
  const { data: org } = useGuardedRouteData<Organization, Record<string, never>>('org-detail');

  return <QuotasTable data={allowanceBuckets} resourceType="organization" resource={org} />;
});
