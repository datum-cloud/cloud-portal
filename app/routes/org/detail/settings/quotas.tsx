import { RestrictedState } from '@/components/restricted-state/restricted-state';
import { QuotasTable } from '@/features/quotas/quotas-table';
import { gateRouteAccess } from '@/modules/rbac/server/check-permission';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import type { Organization } from '@/resources/organizations';
import { buildOrganizationNamespace } from '@/utils/common';
import { BadRequestError, withLoaderErrors } from '@/utils/errors';
import { LoaderFunctionArgs, useLoaderData, useRouteLoaderData } from 'react-router';

export const loader = withLoaderErrors(async ({ params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new BadRequestError('Organization ID is required');
  }

  const canView = await gateRouteAccess(orgId, {
    resource: 'allowancebuckets',
    verb: 'list',
    group: 'quota.miloapis.com',
    namespace: buildOrganizationNamespace(orgId),
  });

  if (!canView) {
    return { restricted: true as const, allowanceBuckets: [] as AllowanceBucket[] };
  }

  // Services now use global axios client with AsyncLocalStorage
  const allowanceBuckets = await createAllowanceBucketService().list('organization', orgId);
  return { restricted: false as const, allowanceBuckets };
});

export const handle = {
  breadcrumb: () => <span>Quotas</span>,
};

export default function OrgSettingsUsagePage() {
  const org = useRouteLoaderData<Organization>('org-detail');
  const { restricted, allowanceBuckets } = useLoaderData<typeof loader>();

  if (restricted) {
    return (
      <RestrictedState
        title="Access restricted"
        message="You don't have permission to view quotas."
      />
    );
  }

  return <QuotasTable data={allowanceBuckets} resourceType="organization" resource={org!} />;
}
