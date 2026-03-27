import { createActivityClientConfig, getOrganizationControlPlanePath } from '@/lib/activity-client';
import { createOrgResourceLinkResolver } from '@/lib/activity-link-resolvers';
import type { Organization } from '@/resources/organizations';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { ActivityFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { useMemo } from 'react';
import { type MetaFunction, useParams, useRouteLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Org Activity');
});

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export default function OrgActivityPage() {
  const { orgId } = useParams();
  const org = useRouteLoaderData<Organization>('org-detail');

  const client = useMemo(() => {
    const orgName = org?.name ?? orgId ?? '';
    return new ActivityApiClient(
      createActivityClientConfig(getOrganizationControlPlanePath(orgName))
    );
  }, [org?.name, orgId]);

  const resourceLinkResolver = useMemo(() => createOrgResourceLinkResolver(orgId ?? ''), [orgId]);

  if (!orgId) return null;

  return (
    <ActivityFeed
      client={client}
      compact={false}
      initialFilters={{
        changeSource: 'human',
      }}
      tenantRenderer={() => null}
      enableStreaming={false}
      pageSize={30}
      resourceLinkResolver={resourceLinkResolver}
    />
  );
}
