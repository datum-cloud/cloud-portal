import { BadgeCopy } from '@/components/badge/badge-copy';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { NameserverChips } from '@/components/nameserver-chips';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { DomainStatus } from '@/features/edge/domain/status';
import type { DnsZone } from '@/resources/dns-zones';
import type { Domain } from '@/resources/domains';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardContent, LinkButton, Badge } from '@datum-ui/components';
import { useMemo } from 'react';

export const DomainGeneralCard = ({
  domain,
  dnsZone,
  projectId,
}: {
  domain: Domain;
  dnsZone?: DnsZone;
  projectId?: string;
}) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!domain) return [];

    return [
      {
        label: 'Resource Name',
        content: <BadgeCopy value={domain.name ?? ''} badgeType="muted" badgeTheme="solid" />,
      },
      {
        label: 'Registrar',
        content: domain.status?.registration?.registrar?.name ? (
          <Badge type="quaternary" theme="outline" className="rounded-xl text-sm font-normal">
            {domain.status?.registration?.registrar?.name}
          </Badge>
        ) : (
          '-'
        ),
      },
      {
        label: 'DNS Host',
        content: <NameserverChips data={domain?.status?.nameservers} maxVisible={99} wrap />,
      },
      {
        label: 'Status',
        content: <DomainStatus domainStatus={domain.status} />,
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
            date={domain?.createdAt ?? ''}
            variant="absolute"
            format="yyyy-MM-dd, HH:mmaaa"
          />
        ),
      },
      {
        label: 'DNS Zone',
        content: dnsZone ? (
          <LinkButton
            type="primary"
            theme="link"
            size="link"
            className="font-semibold"
            to={getPathWithParams(paths.project.detail.dnsZones.detail.overview, {
              projectId: projectId ?? '',
              dnsZoneId: dnsZone?.name,
            })}>
            {domain.domainName}
          </LinkButton>
        ) : (
          <LinkButton
            type="primary"
            theme="link"
            size="link"
            className="font-semibold"
            to={getPathWithParams(
              paths.project.detail.dnsZones.new,
              {
                projectId,
              },
              new URLSearchParams({
                domainName: domain.domainName ?? '',
              })
            )}>
            Transfer to Datum
          </LinkButton>
        ),
      },
    ];
  }, [domain, dnsZone]);

  return (
    <Card className="w-full p-0 shadow-md">
      <CardContent className="px-9 py-6">
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
