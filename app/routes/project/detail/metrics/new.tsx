import { ExportPolicyComingSoonCard } from '@/features/metric/export-policies/card/coming-soon-card';
import { ExportPolicyGrafanaCard } from '@/features/metric/export-policies/card/grafana-card';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { PageTitle } from '@datum-cloud/datum-ui/page-title';
import { useEffect, useRef } from 'react';
import { MetaFunction, useParams, useSearchParams } from 'react-router';

export const meta: MetaFunction = mergeMeta(() => {
  return metaObject('Create an Export Policy');
});

export const handle = {
  breadcrumb: () => <span>Create an Export Policy</span>,
};

export default function ExportPoliciesNewPage() {
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Capture initial open state from search params (read once via ref)
  const initialOpenRef = useRef(
    searchParams.get('action') === 'create' && searchParams.get('provider') === 'grafana'
  );

  // Clean up search params after mount
  useEffect(() => {
    if (searchParams.get('action') === 'create' && searchParams.get('provider') === 'grafana') {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('action');
      nextParams.delete('provider');
      setSearchParams(nextParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return (
    <div className="flex w-full flex-col gap-8">
      <PageTitle title="Create an Export Policy" />

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} className="w-full md:h-full">
          <ExportPolicyGrafanaCard
            projectId={projectId as string}
            defaultOpen={initialOpenRef.current}
          />
        </Col>
        <Col xs={24} md={12} className="w-full md:h-full">
          <ExportPolicyComingSoonCard />
        </Col>
      </Row>
    </div>
  );
}
