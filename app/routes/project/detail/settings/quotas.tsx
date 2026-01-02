import { QuotasTable } from '@/features/quotas/quotas-table';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
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

  const { controlPlaneClient, requestId } = context as AppLoadContext;
  const allowanceBucketService = createAllowanceBucketService({
    controlPlaneClient,
    requestId,
  });
  const allowanceBuckets = await allowanceBucketService.list('project', projectId);
  return allowanceBuckets;
};

export default function ProjectQuotasPage() {
  const { project } = useRouteLoaderData('project-detail');
  const allowanceBuckets = useLoaderData<typeof loader>() as AllowanceBucket[];

  return <QuotasTable data={allowanceBuckets} resourceType="project" resource={project!} />;
}
