import { PageTitle } from '@/components/page-title/page-title';
import { ExportPolicyDangerCard } from '@/features/metric/export-policies/danger-card';
import { ExportPolicyGeneralCard } from '@/features/metric/export-policies/general-card';
import { WorkloadSinksTable } from '@/features/metric/export-policies/sinks-table';
import { WorkloadSourcesTable } from '@/features/metric/export-policies/sources-table';
import { IExportPolicyControlResponse } from '@/resources/interfaces/export-policy.interface';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components';
import { MetaFunction, useParams, useRouteLoaderData } from 'react-router';

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'export-policy-detail') as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as IExportPolicyControlResponse)?.name || 'Export Policy');
});

export default function ExportPolicyOverview() {
  const exportPolicy = useRouteLoaderData<IExportPolicyControlResponse>('export-policy-detail');
  const { projectId } = useParams();

  return (
    <div className="mx-auto w-full">
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <PageTitle title={exportPolicy?.name ?? 'Export Policy'} />
        </Col>
        <Col span={24}>
          <ExportPolicyGeneralCard exportPolicy={exportPolicy ?? {}} />
        </Col>
        <Col span={24}>
          <WorkloadSourcesTable data={exportPolicy?.sources ?? []} />
        </Col>
        <Col span={24}>
          <WorkloadSinksTable
            data={exportPolicy?.sinks ?? []}
            status={exportPolicy?.status ?? {}}
          />
        </Col>
        <Col span={24}>
          <h3 className="mb-4 text-base font-medium">Delete Policy</h3>
          <ExportPolicyDangerCard exportPolicy={exportPolicy ?? {}} />
        </Col>
      </Row>
    </div>
  );
}
