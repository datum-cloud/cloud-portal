import { QuotasTable } from '@/features/quotas/quotas-table';
import { useGuardedRouteData } from '@/modules/rbac';
import { defineResourceRoute } from '@/modules/rbac/define-resource-route';
import { runListLoader } from '@/modules/rbac/run-resource-loader';
import { createAllowanceBucketService, type AllowanceBucket } from '@/resources/allowance-buckets';
import type { Organization } from '@/resources/organizations';
import {
  createResourceRegistrationService,
  type ResourceRegistrationType,
} from '@/resources/resource-registrations';
import { buildOrganizationNamespace } from '@/utils/common';
import { type LoaderFunctionArgs } from 'react-router';

interface QuotasLoaderData {
  buckets: AllowanceBucket[];
  /**
   * Map of `resourceType` → registration `type` so the table can
   * distinguish Feature-flag buckets (no consumption metric) from
   * countable Entity/Allocation buckets. Serialised as a record-of-
   * strings on the wire; we rebuild the Map client-side.
   */
  registrationTypes: Record<string, ResourceRegistrationType>;
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
      const [buckets, registrations] = await Promise.all([
        createAllowanceBucketService().list('organization', orgId!),
        createResourceRegistrationService()
          .list('organization', orgId!)
          .catch(() => []),
      ]);
      const registrationTypes: Record<string, ResourceRegistrationType> = {};
      for (const r of registrations) {
        registrationTypes[r.resourceType] = r.type;
      }
      return { buckets, registrationTypes };
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
      registrationTypes={data.registrationTypes}
      resourceType="organization"
      resource={org}
    />
  );
});
