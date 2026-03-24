import { DnsRecordCard } from '@/features/edge/dns-records';
import { RefreshNameserversButton } from '@/features/edge/dns-zone/components/refresh-nameservers-button';
import { TaskNameserverCard } from '@/features/edge/dns-zone/overview/task-nameserver-card';
import { TaskRecordCard } from '@/features/edge/dns-zone/overview/task-record-card';
import { NameserverCard } from '@/features/edge/nameservers';
import type { FlattenedDnsRecord } from '@/resources/dns-records';
import type { DnsZone } from '@/resources/dns-zones';
import { useDomain, useDomainWatch } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getDnsSetupStatus, getNameserverSetupStatus } from '@/utils/helpers/dns-record.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, LinkButton, Row } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { PageTitle } from '@datum-ui/components/page-title';
import { PencilIcon } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams, useRouteLoaderData } from 'react-router';

export default function DnsZoneOverviewPage() {
  const { dnsZone, dnsRecordSets } =
    useRouteLoaderData<{
      dnsZone: DnsZone;
      dnsRecordSets: FlattenedDnsRecord[];
    }>('dns-zone-detail') ?? {};

  const { projectId } = useParams();

  const domainName = dnsZone?.status?.domainRef?.name ?? '';
  const hasDomain = !!domainName;

  // Get live domain data from React Query
  const { data: domain } = useDomain(projectId ?? '', domainName, {
    enabled: hasDomain,
  });

  // Subscribe to real-time domain updates (for nameserver status)
  useDomainWatch(projectId ?? '', domainName, { enabled: hasDomain });

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
                as={Link}
                href={getPathWithParams(paths.project.detail.dnsZones.detail.dnsRecords, {
                  projectId: projectId ?? '',
                  dnsZoneId: dnsZone?.name ?? '',
                })}
                icon={<Icon icon={PencilIcon} size={12} />}
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
                <div className="flex flex-wrap items-center justify-end gap-2.5">
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
                    as={Link}
                    href={getPathWithParams(paths.project.detail.dnsZones.detail.nameservers, {
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
