import { QuotasTable } from '@/features/quotas/quotas-table';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { useProjectContext } from '@/providers/project.provider';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import {
  createResourceRegistrationService,
  type ResourceRegistration,
} from '@/resources/resource-registrations';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { type LoaderFunctionArgs } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Quotas</span>,
};

export const shouldRevalidate = skipRevalidateWithinSameProject;

interface ProjectQuotasLoaderData {
  buckets: AllowanceBucket[];
  registrations: Record<string, ResourceRegistration>; // keyed by resourceType
}

const route = defineResourceRoute<ProjectQuotasLoaderData>({
  type: 'list',
  resource: 'allowancebuckets',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view quotas.",
  metaTitle: 'Quotas',
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<ProjectQuotasLoaderData>(args, {
    resource: 'allowancebuckets',
    group: 'quota.miloapis.com',
    scope: 'project',
    fetch: async ({ projectId }) => {
      const [buckets, registrationList] = await Promise.all([
        createAllowanceBucketService().list('project', projectId!),
        createResourceRegistrationService()
          .list('project', projectId!)
          .catch(() => []),
      ]);
      const registrations: Record<string, ResourceRegistration> = {};
      for (const r of registrationList) {
        registrations[r.resourceType] = r;
      }
      return { buckets, registrations };
    },
  });
export const meta = route.meta;

export default route.Page(({ data }) => {
  const { project } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <QuotasTable
      data={data.buckets}
      registrations={data.registrations}
      resourceType="project"
      resource={project}
    />
  );
});
