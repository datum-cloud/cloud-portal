import { ResourceActivityFeed, useUserActivityClient } from '@/features/activity';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import type { MetaFunction } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Activity');
});

export default function AccountSettingsActivityPage() {
  const { client, resourceLinkResolver } = useUserActivityClient();

  return (
    <ResourceActivityFeed
      client={client}
      resourceLinkResolver={resourceLinkResolver}
      compact={false}
    />
  );
}
