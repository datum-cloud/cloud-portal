import { BadgeCopy } from '@/components/badge/badge-copy';
import { NoteCard } from '@/components/note-card/note-card';
import { RefreshNameserversButton } from '@/features/edge/dns-zone/components/refresh-nameservers-button';
import { NameserverTable } from '@/features/edge/nameservers';
import { useGuardedRouteData } from '@/modules/rbac';
import type { DnsZone } from '@/resources/dns-zones';
import { useDomain, useDomainWatch, type Domain } from '@/resources/domains';
import { getNameserverSetupStatus } from '@/utils/helpers/dns-record.helper';
import { Col, Row } from '@datum-cloud/datum-ui/grid';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Text } from '@datum-cloud/datum-ui/typography';
import { InfoIcon, RefreshCcwIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useParams } from 'react-router';

export const handle = {
  breadcrumb: () => <span>Nameservers</span>,
};

export default function DnsZoneNameserversPage() {
  const { data: dnsZone } = useGuardedRouteData<DnsZone, { domain: Domain | null }>(
    'dns-zone-detail'
  );

  const { projectId = '' } = useParams<{ projectId: string }>();
  const domainName = dnsZone?.status?.domainRef?.name ?? '';
  const hasDomain = !!domainName;

  // Get live domain data from React Query
  const { data: domain } = useDomain(projectId, domainName, {
    enabled: hasDomain,
  });

  // Subscribe to real-time domain updates (for nameserver status)
  useDomainWatch(projectId, domainName, { enabled: hasDomain });

  const dnsHost = useMemo(() => {
    return domain?.status?.nameservers?.[0]?.ips?.[0]?.registrantName;
  }, [domain]);

  // Registrar names often end in a period ("NameCheap, Inc.") so the copy below
  // never places its own period directly after the name.
  const registrarLabel = domain?.status?.registration?.registrar?.name ?? 'your domain registrar';
  const dnsHostLabel = dnsHost ?? 'another DNS provider';

  const nameserverSetup = useMemo(() => getNameserverSetupStatus(dnsZone), [dnsZone]);
  const datumNameservers: string[] = dnsZone?.status?.nameservers ?? [];

  return (
    <Row gutter={[0, 32]}>
      <Col span={24}>
        <NameserverTable
          titleActions={
            domain?.name && (
              <RefreshNameserversButton
                size="xs"
                type="secondary"
                theme="outline"
                lastRefreshAttempt={domain?.desiredRegistrationRefreshAttempt}
                domainName={domain?.name ?? ''}
                projectId={projectId}
                label="Refresh nameservers"
                icon={<Icon icon={RefreshCcwIcon} size={12} />}
              />
            )
          }
          data={dnsZone?.status?.domainRef?.status?.nameservers ?? []}
          registration={domain?.status?.registration ?? {}}
        />
      </Col>
      {!nameserverSetup.isFullySetup && domain?.name && (
        <Col span={24}>
          <NoteCard
            icon={<Icon icon={InfoIcon} className="size-5" />}
            title={
              nameserverSetup.isPartiallySetup
                ? 'Nameserver Setup Incomplete'
                : 'Your DNS Zone is Hosted Elsewhere'
            }
            description={
              <div className="flex max-w-full flex-col gap-5 sm:max-w-[810px]">
                <Text>
                  {datumNameservers.length === 0 ? (
                    <>
                      Datum is still assigning nameservers to this zone. Once they are ready they
                      will appear here, and you can then point {registrarLabel} at them.
                    </>
                  ) : nameserverSetup.isPartiallySetup ? (
                    <>
                      You have configured {nameserverSetup.setupCount} of{' '}
                      {nameserverSetup.totalCount} Datum nameservers. For redundancy, add the
                      remaining ones at {registrarLabel} so the list matches the following:
                    </>
                  ) : (
                    <>
                      This DNS zone is currently hosted by {dnsHostLabel}. The underlying domain is
                      registered with {registrarLabel}, so to use Datum nameservers, sign in there
                      and replace the existing nameservers with the following:
                    </>
                  )}
                </Text>
                {datumNameservers.length > 0 && (
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    {datumNameservers.map((nameserver) => (
                      <BadgeCopy
                        key={nameserver}
                        value={nameserver}
                        text={nameserver}
                        badgeTheme="solid"
                        badgeType="quaternary"
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
