import { ExportPolicyComingSoonCard } from '@/features/metric/export-policies/card/coming-soon-card';
import { ExportPolicyGrafanaCard } from '@/features/metric/export-policies/card/grafana-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components';
import { PageTitle } from '@datum-ui/components/page-title';
import { MetaFunction, useParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Create an Export Policy');
});

export const handle = {
  breadcrumb: () => <span>Create an Export Policy</span>,
};

export default function ExportPoliciesNewPage() {
  const { projectId } = useParams();
  return (
    <div className="flex w-full flex-col gap-8">
      <PageTitle title="Create an Export Policy" />

      <Row gutter={28}>
        <Col span={12} className="h-full">
          <ExportPolicyGrafanaCard projectId={projectId as string} />
        </Col>
        <Col span={12} className="h-full">
          <ExportPolicyComingSoonCard />
        </Col>
      </Row>
    </div>
  );
}
