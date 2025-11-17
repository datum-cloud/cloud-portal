import { PageTitle } from '@/components/page-title/page-title';
import { NameserverCard } from '@/features/edge/dns-zone/overview/nameservers';
import { TaskNameserverCard } from '@/features/edge/dns-zone/overview/task-nameserver-card';
import { TaskRecordCard } from '@/features/edge/dns-zone/overview/task-record-card';
import { IDnsNameserver, IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, LinkButton, Row } from '@datum-ui/components';
import { PencilIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useParams, useRouteLoaderData } from 'react-router';

/* export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS ID are required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const dnsRecordSetsControl = createDnsRecordSetsControl(controlPlaneClient as Client);

  // List returns flattened records (one row per value)
  const flattenedRecords = await dnsRecordSetsControl.list(projectId, dnsZoneId);

  return data(flattenedRecords);
}; */

export default function DnsZoneOverviewPage() {
  const { dnsZone, domain } =
    useRouteLoaderData<{ dnsZone: IDnsZoneControlResponse; domain: IDomainControlResponse }>(
      'dns-zone-detail'
    ) ?? {};
  // const flattenedRecords = useLoaderData<typeof loader>();
  const { projectId } = useParams();

  const hasNameserverSetup = useMemo(() => {
    const datumNs = dnsZone?.status?.nameservers ?? [];
    const zoneNs =
      dnsZone?.status?.domainRef?.status?.nameservers?.map((ns: IDnsNameserver) => ns.hostname) ??
      [];
    return datumNs.some((ns: string) => zoneNs.includes(ns));
  }, [dnsZone]);

  return (
    <Row gutter={[0, 28]}>
      <Col span={24}>
        <PageTitle title={dnsZone?.domainName ?? 'DNS Zone'} />
      </Col>
      <Col span={24}>
        <TaskRecordCard projectId={projectId ?? ''} dnsZone={dnsZone!} />
        {/* <DnsRecordCard
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
      <Col span={24}>
        {hasNameserverSetup ? (
          <NameserverCard
            nameservers={domain?.status?.nameservers ?? []}
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
          <TaskNameserverCard dnsZone={dnsZone!} />
        )}
      </Col>
    </Row>
  );
}
