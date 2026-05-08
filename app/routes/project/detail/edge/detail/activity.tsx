import { ResourceActivityFeed, useProjectActivityClient } from '@/features/activity';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { useParams } from 'react-router';
import type { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Activity</span>,
};

export const meta: MetaFunction = mergeMeta(() => metaObject('Activity'));

export default function ProxyActivityPage() {
  const { proxyId } = useParams();
  const { client, resourceLinkResolver } = useProjectActivityClient();

  return (
    <Row type="flex" gutter={[24, 24]}>
      <Col span={24}>
        <PageTitle title="Activity" description="Audit trail for this AI Edge proxy." />
      </Col>
      <Col span={24}>
        <ResourceActivityFeed
          client={client}
          resourceLinkResolver={resourceLinkResolver}
          resourceKinds={['HTTPProxy']}
          resourceName={proxyId}
        />
      </Col>
    </Row>
  );
}
