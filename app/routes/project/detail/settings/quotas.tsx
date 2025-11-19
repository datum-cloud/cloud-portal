import { QuotasTable } from '@/features/quotas/quotas-table';
import { createAllowanceBucketsControl } from '@/resources/control-plane/quota/allowancebuckets.control';
import { IAllowanceBucketControlResponse } from '@/resources/interfaces/allowance-bucket.interface';
import { Client } from '@hey-api/client-axios';
import {
  LoaderFunctionArgs,
  AppLoadContext,
  useLoaderData,
  useRouteLoaderData,
} from 'react-router';

export const handle = {
  breadcrumb: () => <span>Quotas</span>,
};

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const allowanceBucketsControl = createAllowanceBucketsControl(controlPlaneClient as Client);
  const allowanceBuckets = await allowanceBucketsControl.list('project', projectId);
  return allowanceBuckets;
};

export default function ProjectQuotasPage() {
  const { project } = useRouteLoaderData('project-detail');
  const allowanceBuckets = useLoaderData<typeof loader>() as IAllowanceBucketControlResponse[];

  return <QuotasTable data={allowanceBuckets} resourceType="project" resource={project!} />;
}
