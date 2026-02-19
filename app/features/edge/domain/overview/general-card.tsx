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
import { Link } from 'react-router';

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
        content: <DateTime className="text-sm" date={domain?.createdAt ?? ''} />,
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
        ) : (
          <LinkButton
            as={Link}
            type="primary"
            theme="link"
            size="link"
            className="font-semibold"
            href={getPathWithParams(
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
    <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="p-0 sm:px-6 sm:pb-4">
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
