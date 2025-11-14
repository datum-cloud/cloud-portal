import { PageTitle } from '@/components/page-title/page-title';
import { NameserverCard } from '@/features/edge/dns-zone/overview/nameservers';
import { TaskRecordCard } from '@/features/edge/dns-zone/overview/task-record-card';
import { createDnsRecordSetsControl } from '@/resources/control-plane/dns-networking/dns-record-set.control';
import { paths } from '@/utils/config/paths.config';
import { BadRequestError } from '@/utils/errors';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Col, LinkButton, Row } from '@datum-ui/components';
import { Client } from '@hey-api/client-axios';
import { PencilIcon } from 'lucide-react';
import {
  AppLoadContext,
  LoaderFunctionArgs,
  data,
  useLoaderData,
  useParams,
  useRouteLoaderData,
} from 'react-router';

export const loader = async ({ context, params }: LoaderFunctionArgs) => {
  const { projectId, dnsZoneId } = params;

  if (!projectId || !dnsZoneId) {
    throw new BadRequestError('Project ID and DNS ID are required');
  }

  const { controlPlaneClient } = context as AppLoadContext;
  const dnsRecordSetsControl = createDnsRecordSetsControl(controlPlaneClient as Client);

  const dnsRecordSets = await dnsRecordSetsControl.list(projectId, dnsZoneId, 5);

  return data(dnsRecordSets);
};

export default function DnsZoneOverviewPage() {
  const { dnsZone, domain } = useRouteLoaderData('dns-zone-detail');
  const { projectId, dnsZoneId } = useParams();

  return (
    <Row gutter={[0, 28]}>
      <Col span={24}>
        <PageTitle title={dnsZone?.domainName ?? 'DNS Zone'} />
      </Col>
      <Col span={24}>
        <TaskRecordCard dnsZone={dnsZone!} />
      </Col>
      <Col span={24}>
        <NameserverCard
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
        />
      </Col>
    </Row>
  );
}
