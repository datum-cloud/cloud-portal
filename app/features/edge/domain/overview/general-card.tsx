import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { NameserverChips } from '@/components/nameserver-chips';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { RegistrarBadge } from '@/features/edge/domain/registrar-badge';
import { useResourcePermissions } from '@/modules/rbac';
import { AnalyticsAction, useAnalytics } from '@/modules/rybbit';
import type { DnsZone } from '@/resources/dns-zones';
import type { Domain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { LinkButton } from '@datum-cloud/datum-ui/button';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { type ReactNode, useMemo } from 'react';
import { Link } from 'react-router';

export const DomainGeneralCard = ({
  domain,
  dnsZone,
  projectId,
  notes,
}: {
  domain: Domain;
  dnsZone?: DnsZone;
  projectId?: string;
  /** Content for the Notes row. The row is omitted when not provided. */
  notes?: ReactNode;
}) => {
  const { trackAction } = useAnalytics();

  const { canCreate: canCreateDnsZone } = useResourcePermissions({
    resource: 'dnszones',
    group: 'dns.networking.miloapis.com',
    scope: 'project',
    verbs: ['create'],
  });

  const listItems: ListItem[] = useMemo(() => {
    if (!domain) return [];

    const registrationFetching = !!domain.status && !domain.status?.registration;
    // Nameservers are written by the same lookup that stamps lastRefreshAttempt,
    // so once it has run, an empty list means none were found.
    const lookupDone = !!domain.status?.registration?.lastRefreshAttempt;
    const nameservers = domain.status?.nameservers ?? [];
    const nameserversFetching = !!domain.status && !nameservers.length && !lookupDone;

    return [
      {
        label: 'Resource Name',
        content: <BadgeCopy value={domain.name ?? ''} badgeType="muted" badgeTheme="solid" />,
      },
      {
        label: 'Registrar',
        content: registrationFetching ? (
          <Tooltip message="Registrar information is being fetched and will appear shortly.">
            <Text textColor="muted" className="animate-pulse">
              Looking up...
            </Text>
          </Tooltip>
        ) : (
          <RegistrarBadge
            registration={domain.status?.registration}
            className="rounded-xl text-sm font-normal"
          />
        ),
      },
      {
        label: 'DNS Host',
        content: nameserversFetching ? (
          <Tooltip message="DNS host information is being fetched and will appear shortly.">
            <Text textColor="muted" className="animate-pulse">
              Looking up...
            </Text>
          </Tooltip>
        ) : nameservers.length ? (
          <NameserverChips data={nameservers} maxVisible={99} wrap />
        ) : (
          <Text textColor="muted">None found</Text>
        ),
      },
      {
        label: 'Expiration Date',
        content: <DomainExpiration expiresAt={domain?.status?.registration?.expiresAt} />,
      },
      {
        label: 'Created At',
        content: (
          <DateTime
            className="text-sm"
            variant="relative"
            addSuffix
            date={domain?.createdAt ?? ''}
          />
        ),
      },
      {
        label: 'DNS Zone',
        content: dnsZone ? (
          <LinkButton
            as={Link}
            type="primary"
            theme="link"
            size="link"
            className="font-semibold"
            href={getPathWithParams(paths.project.detail.dnsZones.detail.root, {
              projectId: projectId ?? '',
              dnsZoneId: dnsZone?.name,
            })}>
            {domain.domainName}
          </LinkButton>
        ) : canCreateDnsZone ? (
          <LinkButton
            as={Link}
            type="primary"
            theme="link"
            size="link"
            className="font-semibold"
            onClick={() => trackAction(AnalyticsAction.TransferDnsToDatum)}
            href={getPathWithParams(
              paths.project.detail.dnsZones.root,
              {
                projectId,
              },
              new URLSearchParams({
                action: 'create',
                domainName: domain.domainName ?? '',
              })
            )}>
            Set up DNS zone
          </LinkButton>
        ) : (
          '-'
        ),
      },
      {
        label: 'Notes',
        content: notes,
        hidden: notes === undefined,
        // Notes can run several lines; keep the label at the top of the row.
        className: 'sm:items-start',
      },
    ];
  }, [domain, dnsZone, trackAction, projectId, canCreateDnsZone, notes]);

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden">
      <CardContent padding="none">
        {/* Tighter rows and a fixed label column instead of the default 50/50 split */}
        <List
          items={listItems}
          itemClassName="py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-x-4"
          labelClassName="text-muted-foreground font-normal"
        />
      </CardContent>
    </Card>
  );
};
