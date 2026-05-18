import { ResourceActivityFeed, useOrgActivityClient } from '@/features/activity';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Org Activity');
});

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export default function OrgActivityPage() {
  const { client, resourceLinkResolver } = useOrgActivityClient();

  return (
    <ResourceActivityFeed
      client={client}
      resourceLinkResolver={resourceLinkResolver}
      compact={false}
    />
  );
}
