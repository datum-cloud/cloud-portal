import { PageTitle } from '@/components/page-title/page-title';
import { ExportPolicyActivityCard } from '@/features/metric/export-policies/card/activity-card';
import { ExportPolicyDangerCard } from '@/features/metric/export-policies/card/danger-card';
import { ExportPolicyGeneralCard } from '@/features/metric/export-policies/card/general-card';
import { WorkloadSinksTable } from '@/features/metric/export-policies/sinks-table';
import { WorkloadSourcesTable } from '@/features/metric/export-policies/sources-table';
import { IExportPolicyControlResponse } from '@/resources/export-policies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-ui/components';
import { MetaFunction, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: (data: IExportPolicyControlResponse) => {
    return <span>{data?.name ?? 'Overview'}</span>;
  },
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'export-policy-detail') as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as IExportPolicyControlResponse)?.name || 'Export Policy');
});

export default function ExportPolicyOverview() {
  const exportPolicy = useRouteLoaderData<IExportPolicyControlResponse>('export-policy-detail');

  return (
    <div className="mx-auto w-full">
      <Row gutter={[24, 32]}>
        <Col span={24}>
          <PageTitle title={exportPolicy?.name ?? 'Export Policy'} />
        </Col>
      </Row>
      <Row type="flex" gutter={[24, 32]}>
        <Col
          span={24}
          className="mb-4"
          xs={{ span: 24 }}
          sm={{ span: 24 }}
          md={{ span: 24 }}
          lg={{ span: 12 }}>
          <ExportPolicyGeneralCard exportPolicy={exportPolicy ?? {}} />
        </Col>
        <Col
          span={24}
          className="mb-4"
          xs={{ span: 24 }}
          sm={{ span: 24 }}
          md={{ span: 24 }}
          lg={{ span: 12 }}>
          <ExportPolicyActivityCard />
        </Col>
      </Row>
      <Row gutter={[24, 32]}>
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
