import { ResourceActivityFeed, useProjectActivityClient } from '@/features/activity';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Activity'));

export default function ProjectActivityLogsPage() {
  const { client, resourceLinkResolver } = useProjectActivityClient();

  return (
    <ResourceActivityFeed
      client={client}
      resourceLinkResolver={resourceLinkResolver}
      compact={false}
    />
  );
}
