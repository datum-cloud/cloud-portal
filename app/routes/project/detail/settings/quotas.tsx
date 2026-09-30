import { QuotasTable } from '@/features/quotas/quotas-table';
import { resolveEntitledServiceIds } from '@/modules/entitlements/entitled-services.server';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { useProjectContext } from '@/providers/project.provider';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import {
  createResourceRegistrationService,
  type ResourceRegistration,
} from '@/resources/resource-registrations';
import { skipRevalidateWithinSameProject } from '@/utils/helpers/revalidate.helper';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { type LoaderFunctionArgs } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Quotas</span>,
};

export const shouldRevalidate = skipRevalidateWithinSameProject;

interface ProjectQuotasLoaderData {
  buckets: AllowanceBucket[];
  registrations: Record<string, ResourceRegistration>; // keyed by resourceType
  /** Active entitlement service ids for this project; null when unknown (fail open). */
  entitledServiceIds: string[] | null;
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
      const [buckets, registrationList, entitled] = await Promise.all([
        createAllowanceBucketService().list('project', projectId!),
        createResourceRegistrationService()
          .list('project', projectId!)
          .catch(() => []),
        resolveEntitledServiceIds([projectId!]),
      ]);
      const registrations: Record<string, ResourceRegistration> = {};
      for (const r of registrationList) {
        registrations[r.resourceType] = r;
      }
      return { buckets, registrations, entitledServiceIds: entitled ? [...entitled] : null };
    },
  });
export const meta = route.meta;

export default route.Page(({ data }) => {
  const { project } = useProjectContext();

  if (!project) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Quotas" titleClassName="text-3xl" />
      <QuotasTable
        data={data.buckets}
        registrations={data.registrations}
        entitledServiceIds={data.entitledServiceIds}
        resourceType="project"
        resource={project}
      />
    </div>
  );
});
