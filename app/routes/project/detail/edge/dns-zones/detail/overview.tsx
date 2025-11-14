import { PageTitle } from '@/components/page-title/page-title';
import { TaskNameserverCard } from '@/features/edge/dns-zone/overview/task-nameserver-card';
import { TaskRecordCard } from '@/features/edge/dns-zone/overview/task-record-card';
import { Col, Row } from '@datum-ui/components';
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
  const { dnsZone, domain } = useRouteLoaderData('dns-zone-detail');
  // const flattenedRecords = useLoaderData<typeof loader>();
  const { projectId, dnsZoneId } = useParams();

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
        <TaskNameserverCard dnsZone={dnsZone!} />
        {/* <NameserverCard
          nameservers={domain?.status?.nameservers ?? []}
          registration={domain?.status?.registration ?? {}}
          actions={
            <LinkButton
              to={getPathWithParams(paths.project.detail.dnsZones.detail.nameservers, {
                projectId: projectId ?? '',
                dnsZoneId: dnsZoneId ?? '',
              })}
              icon={<PencilIcon size={12} />}
              iconPosition="right"
              size="xs">
              Edit nameservers
            </LinkButton>
          }
        /> */}
      </Col>
    </Row>
  );
}
