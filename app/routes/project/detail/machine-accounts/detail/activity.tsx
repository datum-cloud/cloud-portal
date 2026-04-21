import { createActivityClientConfig, getProjectControlPlanePath } from '@/lib/activity-client';
import { createResourceLinkResolver } from '@/lib/activity-link-resolvers';
import { useProjectContext } from '@/providers/project.provider';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { ActivityFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Activity'));

export default function MachineAccountActivityPage() {
  const { projectId, machineAccountId } = useParams();
  const { project } = useProjectContext();

  const client = useMemo(() => {
    const projectName = project?.name ?? projectId ?? '';
    return new ActivityApiClient(
      createActivityClientConfig(getProjectControlPlanePath(projectName))
    );
  }, [project?.name, projectId]);

  const resourceLinkResolver = useMemo(
    () => createResourceLinkResolver(projectId ?? ''),
    [projectId]
  );

  return (
    <ActivityFeed
      client={client}
      compact={true}
      initialFilters={{
        resourceKinds: ['MachineAccount', 'MachineAccountKey'],
        changeSource: 'all',
      }}
      hiddenFilters={['resourceKinds']}
      tenantRenderer={() => null}
      enableStreaming={false}
      pageSize={30}
      resourceLinkResolver={resourceLinkResolver}
    />
  );
}
