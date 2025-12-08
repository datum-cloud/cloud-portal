import { PageTitle } from '@/components/page-title/page-title';
import { DnsRecordCard } from '@/features/edge/dns-records';
import { RefreshNameserversButton } from '@/features/edge/dns-zone/components/refresh-nameservers-button';
import { TaskNameserverCard } from '@/features/edge/dns-zone/overview/task-nameserver-card';
import { TaskRecordCard } from '@/features/edge/dns-zone/overview/task-record-card';
import { NameserverCard } from '@/features/edge/nameservers';
import { IDnsZoneControlResponse, IFlattenedDnsRecord } from '@/resources/interfaces/dns.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { paths } from '@/utils/config/paths.config';
import { getDnsSetupStatus, getNameserverSetupStatus } from '@/utils/helpers/dns-record.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, LinkButton, Row } from '@datum-ui/components';
import { PencilIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useParams, useRouteLoaderData } from 'react-router';

export default function DnsZoneOverviewPage() {
  const { dnsZone, domain, dnsRecordSets } =
    useRouteLoaderData<{
      dnsZone: IDnsZoneControlResponse;
      domain: IDomainControlResponse;
      dnsRecordSets: IFlattenedDnsRecord[];
    }>('dns-zone-detail') ?? {};

  const { projectId } = useParams();

  const nameserverSetup = useMemo(() => getNameserverSetupStatus(dnsZone), [dnsZone]);

  const dnsSetupStatus = useMemo(
    () => getDnsSetupStatus(dnsRecordSets ?? [], dnsZone?.domainName),
    [dnsRecordSets, dnsZone?.domainName]
  );

  return (
    <Row gutter={[0, 28]}>
      <Col span={24}>
        <PageTitle title={dnsZone?.domainName ?? 'DNS Zone'} />
      </Col>
      <Col span={24}>
        {dnsSetupStatus.hasAnySetup ? (
          <DnsRecordCard
            projectId={projectId ?? ''}
            records={dnsSetupStatus.relevantRecords}
            maxRows={5}
            title="DNS Records"
            actions={
              <LinkButton
                to={getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
                  projectId: projectId ?? '',
                  dnsZoneId: dnsZone?.name ?? '',
                })}
                icon={<PencilIcon size={12} />}
                iconPosition="right"
                size="xs">
                Edit DNS records
              </LinkButton>
            }
          />
        ) : (
          <TaskRecordCard projectId={projectId ?? ''} dnsZone={dnsZone!} />
        )}
      </Col>
      {domain?.name && (
        <Col span={24}>
          {nameserverSetup.hasAnySetup ? (
            <NameserverCard
              nameservers={dnsZone?.status?.domainRef?.status?.nameservers ?? []}
              registration={domain?.status?.registration ?? {}}
              actions={
                <div className="flex items-center gap-2.5">
                  {domain?.name && (
                    <RefreshNameserversButton
                      size="xs"
                      type="secondary"
                      theme="outline"
                      lastRefreshAttempt={domain?.desiredRegistrationRefreshAttempt}
                      domainName={domain?.name ?? ''}
                      projectId={projectId ?? ''}
                    />
                  )}
                  <LinkButton
                    to={getPathWithParams(paths.project.detail.dnsZones.detail.nameservers, {
                      projectId: projectId ?? '',
                      dnsZoneId: dnsZone?.name ?? '',
                    })}
                    size="xs">
                    View nameservers
                  </LinkButton>
                </div>
              }
            />
          ) : (
            domain?.name && (
              <TaskNameserverCard dnsZone={dnsZone!} projectId={projectId ?? ''} domain={domain} />
            )
          )}
        </Col>
      )}
    </Row>
  );
}
