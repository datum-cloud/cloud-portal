import { PageTitle } from '@/components/page-title/page-title';
import { NameserverCard } from '@/features/edge/dns-zone/overview/nameservers';
import { TaskNameserverCard } from '@/features/edge/dns-zone/overview/task-nameserver-card';
import { TaskRecordCard } from '@/features/edge/dns-zone/overview/task-record-card';
import { useIsPending } from '@/hooks/useIsPending';
import { IDnsNameserver, IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { ROUTE_PATH as DOMAINS_REFRESH_PATH } from '@/routes/api/domains/refresh';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Button, Col, LinkButton, Row, Tooltip, toast } from '@datum-ui/components';
import { PencilIcon, RefreshCcwIcon } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { useFetcher, useParams, useRouteLoaderData } from 'react-router';

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
  const refreshFetcher = useFetcher({ key: 'refresh-domain' });
  const pending = useIsPending({ fetcherKey: 'refresh-domain' });

  const hasNameserverSetup = useMemo(() => {
    const datumNs = dnsZone?.status?.nameservers ?? [];
    const zoneNs =
      dnsZone?.status?.domainRef?.status?.nameservers?.map((ns: IDnsNameserver) => ns.hostname) ??
      [];
    return datumNs.some((ns: string) => zoneNs.includes(ns));
  }, [dnsZone]);

  const refreshDomain = async () => {
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

  useEffect(() => {
    if (refreshFetcher.data && refreshFetcher.state === 'idle') {
      if (refreshFetcher.data.success) {
        toast.success('DNS Records refreshed successfully', {
          description: 'The DNS Records have been refreshed successfully',
        });
      } else {
        toast.error(refreshFetcher.data.error);
      }
    }
  }, [refreshFetcher.data, refreshFetcher.state]);

  return (
    <Row gutter={[0, 28]}>
      <Col span={24}>
        <PageTitle
          title={dnsZone?.domainName ?? 'DNS Zone'}
          actions={
            <Tooltip message="This will refresh your DNS records">
              <Button
                htmlType="button"
                type="secondary"
                theme="solid"
                size="xs"
                icon={<RefreshCcwIcon size={12} />}
                onClick={() => refreshDomain()}
                disabled={pending}
                loading={pending}>
                Refresh
              </Button>
            </Tooltip>
          }
        />
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
