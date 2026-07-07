import { QuotasTable } from '@/features/quotas/quotas-table';
import { useProjectContext } from '@/providers/project.provider';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import {
  createResourceRegistrationService,
  type ResourceRegistration,
} from '@/resources/resource-registrations';
import { BadRequestError, withLoaderErrors } from '@/utils/errors';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { LoaderFunctionArgs, useLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Quotas</span>,
};

export const shouldRevalidate = skipRevalidateWithinSameProject;

interface ProjectQuotasLoaderData {
  buckets: AllowanceBucket[];
  registrations: Record<string, ResourceRegistration>; // keyed by resourceType
}

export const loader = withLoaderErrors(
  async ({ params }: LoaderFunctionArgs): Promise<ProjectQuotasLoaderData> => {
    const { projectId } = params;

    if (!projectId) {
      throw new BadRequestError('Project ID is required');
    }

    const [buckets, registrationList] = await Promise.all([
      createAllowanceBucketService().list('project', projectId),
      createResourceRegistrationService()
        .list('project', projectId)
        .catch(() => []),
    ]);
    const registrations: Record<string, ResourceRegistration> = {};
    for (const r of registrationList) {
      registrations[r.resourceType] = r;
    }
    return { buckets, registrations };
  }
);

export default function ProjectQuotasPage() {
  const { project } = useProjectContext();
  const { buckets, registrations } = useLoaderData<typeof loader>() as ProjectQuotasLoaderData;

  if (!project) {
    return null;
  }

  return (
    <QuotasTable
      data={buckets}
      registrations={registrations}
      resourceType="project"
      resource={project}
    />
  );
}
