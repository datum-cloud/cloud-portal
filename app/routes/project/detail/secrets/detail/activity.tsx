import { createActivityClientConfig, getProjectControlPlanePath } from '@/lib/activity-client';
import { createResourceLinkResolver } from '@/lib/activity-link-resolvers';
import { useProjectContext } from '@/providers/project.provider';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { ActivityFeed, ActivityApiClient } from '@datum-cloud/activity-ui';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { useMemo } from 'react';
import { useParams } from 'react-router';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Activity'));

export default function SecretActivityPage() {
  const { projectId, secretId } = useParams();
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
    <Row type="flex" gutter={[24, 24]}>
      <Col span={24}>
        <PageTitle title="Activity" description="Audit trail for this secret." />
      </Col>
      <Col span={24}>
        <ActivityFeed
          client={client}
          compact={true}
          initialFilters={{
            resourceKinds: ['Secret'],
            resourceName: secretId,
            changeSource: 'all',
          }}
          hiddenFilters={['resourceKinds', 'resourceName']}
          tenantRenderer={() => null}
          enableStreaming={false}
          pageSize={30}
          resourceLinkResolver={resourceLinkResolver}
        />
      </Col>
    </Row>
  );
}
