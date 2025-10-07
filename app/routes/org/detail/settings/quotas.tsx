import { QuotasTable } from '@/features/quotas/quotas-table';
import { createAllowanceBucketsControl } from '@/resources/control-plane/quota/allowancebuckets.control';
import { IAllowanceBucketControlResponse } from '@/resources/interfaces/allowance-bucket';
import { Client } from '@hey-api/client-axios';
import { LoaderFunctionArgs, AppLoadContext, useLoaderData } from 'react-router';

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { orgId } = params;

  if (!orgId) {
    throw new Error('Organization ID is required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const allowanceBucketsControl = createAllowanceBucketsControl(controlPlaneClient as Client);
  const allowanceBuckets = await allowanceBucketsControl.list('organization', orgId);
  return allowanceBuckets;
};

export default function OrgSettingsUsagePage() {
  const allowanceBuckets = useLoaderData<typeof loader>() as IAllowanceBucketControlResponse[];

  return (
    <QuotasTable
      data={allowanceBuckets}
      title="Quotas"
      description="View usage against quotas for each resource in your organization."
    />
  );
}
