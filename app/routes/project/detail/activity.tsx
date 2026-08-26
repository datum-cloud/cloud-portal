import { ResourceActivityFeed, useProjectActivityClient } from '@/features/activity';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Activity'));

export default function ProjectActivityLogsPage() {
  const { client, resourceLinkResolver } = useProjectActivityClient();

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Activity" titleClassName="text-3xl" />
      <ResourceActivityFeed
        client={client}
        resourceLinkResolver={resourceLinkResolver}
        changeSource="human"
      />
    </div>
  );
}
