import { RestrictedOverlay } from '@/components/restricted-overlay/restricted-overlay';
import { ExportPolicyActivityCard } from '@/features/metric/export-policies/card/activity-card';
import { ExportPolicyDangerCard } from '@/features/metric/export-policies/card/danger-card';
import { ExportPolicyGeneralCard } from '@/features/metric/export-policies/card/general-card';
import { WorkloadSinksTable } from '@/features/metric/export-policies/sinks-table';
import { WorkloadSourcesTable } from '@/features/metric/export-policies/sources-table';
import { useGuardedRouteData, useResourcePermissions } from '@/modules/rbac';
import { type ExportPolicy, type IExportPolicyControlResponse } from '@/resources/export-policies';
import { mergeMeta, metaObject } from '@/utils/helpers/meta.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { LoaderOverlay } from '@datum-cloud/datum-ui/loader-overlay';
import { MetaFunction } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Overview</span>,
};

export const meta: MetaFunction = mergeMeta(({ matches }) => {
  const match = matches.find((match) => match.id === 'export-policy-detail') as any;

  const exportPolicy = match.data;
  return metaObject((exportPolicy as IExportPolicyControlResponse)?.name || 'Export Policy');
});

export default function ExportPolicyOverview() {
  const { data } = useGuardedRouteData<ExportPolicy, Record<string, never>>('export-policy-detail');
  const exportPolicy = data as unknown as IExportPolicyControlResponse;

  const { canDelete, isLoading: permissionsLoading } = useResourcePermissions({
    resource: 'exportpolicies',
    group: 'telemetry.miloapis.com',
    scope: 'project',
    verbs: ['delete'],
  });

  return (
    <div className="mx-auto w-full">
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
          <ExportPolicyDangerCard
            exportPolicy={exportPolicy ?? {}}
            actionHidden={permissionsLoading || !canDelete}>
            {permissionsLoading ? (
              <LoaderOverlay />
            ) : (
              !canDelete && (
                <RestrictedOverlay message="You don't have permission to delete this export policy" />
              )
            )}
          </ExportPolicyDangerCard>
        </Col>
      </Row>
    </div>
  );
}
