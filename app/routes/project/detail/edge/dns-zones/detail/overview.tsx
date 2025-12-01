import { PageTitle } from '@/components/page-title/page-title';
import { NameserverCard } from '@/features/edge/dns-zone/overview/nameservers';
import { TaskNameserverCard } from '@/features/edge/dns-zone/overview/task-nameserver-card';
import { TaskRecordCard } from '@/features/edge/dns-zone/overview/task-record-card';
import { useFetcherWithToast } from '@/hooks/useFetcherWithToast';
import { useIsPending } from '@/hooks/useIsPending';
import { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as DOMAINS_REFRESH_PATH } from '@/routes/api/domains/refresh';
import { paths } from '@/utils/config/paths.config';
import { getNameserverSetupStatus } from '@/utils/helpers/dns-record.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, Col, LinkButton, Row, Tooltip } from '@datum-ui/components';
import { PencilIcon, RefreshCcwIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useParams, useRouteLoaderData } from 'react-router';

export default function DnsZoneOverviewPage() {
  const { dnsZone, domain } =
    useRouteLoaderData<{ dnsZone: IDnsZoneControlResponse; domain: IDomainControlResponse }>(
      'dns-zone-detail'
    ) ?? {};
  const { projectId } = useParams();
  const refreshFetcher = useFetcherWithToast({
    key: 'refresh-nameservers',
    success: {
      title: 'Nameservers refreshed successfully',
      description: 'The Nameservers have been refreshed successfully',
    },
  });
  const pending = useIsPending({ fetcherKey: 'refresh-nameservers' });

  const nameserverSetup = useMemo(() => getNameserverSetupStatus(dnsZone), [dnsZone]);

  const refreshDomain = async () => {
    if (!domain?.name) return;
    await refreshFetcher.submit(
      {
        id: domain?.name ?? '',
        projectId: projectId ?? '',
      },
      {
        method: 'PATCH',
        action: DOMAINS_REFRESH_PATH,
      }
    );
  };

  return (
    <Row gutter={[0, 28]}>
      <Col span={24}>
        <PageTitle
          title={dnsZone?.domainName ?? 'DNS Zone'}
          actions={
            domain?.name && (
              <Tooltip message="Fetch latest configured nameservers">
                <Button
                  htmlType="button"
                  type="primary"
                  theme="solid"
                  size="xs"
                  icon={<RefreshCcwIcon size={12} />}
                  onClick={() => refreshDomain()}
                  disabled={pending}
                  loading={pending}>
                  Refresh
                </Button>
              </Tooltip>
            )
          }
        />
      </Col>
      <Col span={24}>
        <TaskRecordCard projectId={projectId ?? ''} dnsZone={dnsZone!} />
        {/* <DnsRecordCard
          projectId={projectId ?? ''}
          records={flattenedRecords}
          maxRows={5}
          title="DNS Records"
          actions={
            <LinkButton
              to={getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
                projectId: projectId ?? '',
                dnsZoneId: dnsZoneId ?? '',
              })}
              icon={<PencilIcon size={12} />}
              iconPosition="right"
              size="xs">
              Edit DNS records
            </LinkButton>
          }
        /> */}
      </Col>
      {domain?.name && (
        <Col span={24}>
          {nameserverSetup.hasAnySetup ? (
            <NameserverCard
              nameservers={dnsZone?.status?.domainRef?.status?.nameservers ?? []}
              registration={domain?.status?.registration ?? {}}
              actions={
                <LinkButton
                  to={getPathWithParams(paths.project.detail.dnsZones.detail.nameservers, {
                    projectId: projectId ?? '',
                    dnsZoneId: dnsZone?.name ?? '',
                  })}
                  icon={<PencilIcon size={12} />}
                  iconPosition="right"
                  size="xs">
                  View nameservers
                </LinkButton>
              }
            />
          ) : (
            domain?.name && <TaskNameserverCard dnsZone={dnsZone!} />
          )}
        </Col>
      )}
    </Row>
  );
}
