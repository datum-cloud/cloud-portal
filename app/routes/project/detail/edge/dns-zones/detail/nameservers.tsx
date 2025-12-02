import { BadgeCopy } from '@/components/badge/badge-copy';
import { NoteCard } from '@/components/note-card/note-card';
import { NameserverTable } from '@/features/edge/dns-zone/overview/nameservers';
import { useDatumFetcher } from '@/hooks/useDatumFetcher';
import { useIsPending } from '@/hooks/useIsPending';
import { ROUTE_PATH as DOMAINS_REFRESH_PATH } from '@/routes/api/domains/refresh';
import { getNameserverSetupStatus } from '@/utils/helpers/dns-record.helper';
import { Button, Col, Row, Tooltip, toast } from '@datum-ui/components';
import { InfoIcon, RefreshCcwIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useParams, useRouteLoaderData } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Nameservers</span>,
};

export default function DnsZoneNameserversPage() {
  const { dnsZone, domain } = useRouteLoaderData('dns-zone-detail');

  const { projectId } = useParams();
  const refreshFetcher = useDatumFetcher({
    key: 'refresh-nameservers',
    onSuccess: () => {
      toast.success('Nameservers refreshed successfully', {
        description: 'The Nameservers have been refreshed successfully',
      });
    },
    onError: (data) => {
      toast.error(data.error || 'Failed to refresh Nameservers');
    },
  });
  const pending = useIsPending({ fetcherKey: 'refresh-nameservers' });

  const dnsHost = useMemo(() => {
    return domain?.status?.nameservers?.[0]?.ips?.[0]?.registrantName;
  }, [domain]);

  const registrar = useMemo(() => {
    return domain?.status?.registration?.registrar?.name;
  }, [domain]);

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
    <Row gutter={[0, 32]}>
      <Col span={24}>
        <NameserverTable
          tableTitle={{
            title: 'Nameservers',
            actions: domain?.name && (
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
            ),
          }}
          data={dnsZone?.status?.domainRef?.status?.nameservers ?? []}
          registration={domain?.status?.registration ?? {}}
        />
      </Col>
      {!nameserverSetup.isFullySetup && domain?.name && (
        <Col span={24}>
          <NoteCard
            icon={<InfoIcon className="size-5" />}
            title={
              nameserverSetup.isPartiallySetup
                ? 'Nameserver Setup Incomplete'
                : 'Your DNS Zone is Hosted Elsewhere'
            }
            description={
              <div className="flex max-w-[810px] flex-col gap-5">
                <span className="text-sm">
                  {nameserverSetup.isPartiallySetup ? (
                    <>
                      You have configured {nameserverSetup.setupCount} of{' '}
                      {nameserverSetup.totalCount} Datum nameservers. For optimal DNS performance
                      and redundancy, please add all nameservers at {registrar}.
                    </>
                  ) : (
                    <>
                      This DNS zone is currently hosted by {dnsHost} and the underlying domain is
                      registered at {registrar}. To use Datum nameservers, you&apos;ll want to visit{' '}
                      {registrar} and replace the existing nameservers to match the following:
                    </>
                  )}
                </span>
                {dnsZone?.status?.nameservers &&
                  (dnsZone?.status?.nameservers ?? [])?.length > 0 && (
                    <div className="flex items-center gap-4">
                      {dnsZone?.status?.nameservers?.map((nameserver: string, index: number) => (
                        <BadgeCopy
                          key={`nameserver-${index}`}
                          value={nameserver ?? ''}
                          text={nameserver ?? ''}
                          badgeTheme="light"
                          badgeType="quaternary"
                          className="border-none"
                        />
                      ))}
                    </div>
                  )}
              </div>
            }
          />
        </Col>
      )}
    </Row>
  );
}
