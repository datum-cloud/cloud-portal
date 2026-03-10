import { QuotasTable } from '@/features/quotas/quotas-table';
import { useProjectContext } from '@/providers/project.provider';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import { LoaderFunctionArgs, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Quotas</span>,
};

export const loader = async ({ params }: LoaderFunctionArgs) => {
  const { projectId } = params;

  if (!projectId) {
    throw new Error('Project ID is required');
  }

  // Services now use global axios client with AsyncLocalStorage
  const allowanceBucketService = createAllowanceBucketService();
  const allowanceBuckets = await allowanceBucketService.list('project', projectId);
  return allowanceBuckets;
};

export default function ProjectQuotasPage() {
  const { project } = useProjectContext();
  const allowanceBuckets = useLoaderData<typeof loader>() as AllowanceBucket[];

  if (!project) {
    return null;
  }

  return <QuotasTable data={allowanceBuckets} resourceType="project" resource={project} />;
}
