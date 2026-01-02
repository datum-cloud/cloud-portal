import { QuotasTable } from '@/features/quotas/quotas-table';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import type { Organization } from '@/resources/organizations';
import {
  LoaderFunctionArgs,
  AppLoadContext,
  useLoaderData,
  useRouteLoaderData,
} from 'react-router';

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const { controlPlaneClient, requestId } = context as AppLoadContext;
  const allowanceBucketService = createAllowanceBucketService({
    controlPlaneClient,
    requestId,
  });
  const allowanceBuckets = await allowanceBucketService.list('organization', orgId);
  return allowanceBuckets;
};

export default function OrgSettingsUsagePage() {
  const org = useRouteLoaderData<Organization>('org-detail');
  const allowanceBuckets = useLoaderData<typeof loader>() as AllowanceBucket[];

  return <QuotasTable data={allowanceBuckets} resourceType="organization" resource={org!} />;
}
