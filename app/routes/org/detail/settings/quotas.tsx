import { QuotasTable } from '@/features/quotas/quotas-table';
import { useGuardedRouteData } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import type { Organization } from '@/resources/organizations';
import {
  createResourceRegistrationService,
  type ResourceRegistration,
} from '@/resources/resource-registrations';
import { buildOrganizationNamespace } from '@/utils/common';
import { type LoaderFunctionArgs } from 'react-router';

interface QuotasLoaderData {
  buckets: AllowanceBucket[];
  /**
   * Map of `resourceType` → full `ResourceRegistration` so the table can
   * distinguish Feature-flag buckets (no consumption metric) from countable
   * Entity/Allocation buckets, and resolve each quota's display name,
   * description, and owning service for grouping. Serialised as a record on
   * the wire; rebuilt client-side.
   */
  registrations: Record<string, ResourceRegistration>;
}

const route = defineResourceRoute<QuotasLoaderData>({
  type: 'list',
  resource: 'allowancebuckets',
  restrictedTitle: 'Access restricted',
  restrictedMessage: "You don't have permission to view quotas.",
  metaTitle: 'Quotas',
});

export const loader = (args: LoaderFunctionArgs) =>
  runListLoader<QuotasLoaderData>(args, {
    resource: 'allowancebuckets',
    group: 'quota.miloapis.com',
    scope: 'org',
    namespace: buildOrganizationNamespace(args.params.orgId!),
    fetch: async ({ orgId }) => {
      // Fan-out — registration list is the same size as the bucket
      // list (one entry per registered resourceType) and is cheap to
      // pull alongside. Failure is tolerated: an empty map degrades
      // to the previous behaviour (every row rendered as countable),
      // which is the right fallback when the registrations endpoint
      // is unhealthy.
      const [buckets, registrationList] = await Promise.all([
        createAllowanceBucketService().list('organization', orgId!),
        createResourceRegistrationService()
          .list('organization', orgId!)
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

export const handle = {
  breadcrumb: () => <span>Quotas</span>,
};

export default route.Page(({ data }) => {
  const { data: org } = useGuardedRouteData<Organization, Record<string, never>>('org-detail');

  return (
    <QuotasTable
      data={data.buckets}
      registrations={data.registrations}
      resourceType="organization"
      resource={org}
    />
  );
});
