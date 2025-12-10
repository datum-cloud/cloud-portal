import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { NameserverChips } from '@/components/nameserver-chips';
import { TextCopy } from '@/components/text-copy/text-copy';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { DomainStatus } from '@/features/edge/domain/status';
import type { IDnsZoneControlResponse } from '@/resources/interfaces/dns.interface';
import type { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { paths } from '@/utils/config/paths.config';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Card, CardHeader, CardTitle, CardContent, LinkButton } from '@datum-ui/components';
import { useMemo } from 'react';

export const DomainGeneralCard = ({
  domain,
  dnsZone,
  projectId,
}: {
  domain: IDomainControlResponse;
  dnsZone?: IDnsZoneControlResponse;
  projectId?: string;
}) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!domain) return [];

    return [
      {
        label: 'Resource Name',
        className: 'px-2',
        content: <TextCopy className="text-sm" value={domain.name ?? ''} text={domain.name} />,
      },
      {
        label: 'Namespace',
        className: 'px-2',
        content: <span>{domain.namespace}</span>,
      },
      {
        label: 'DNS Host',
        className: 'px-2',
        content: <NameserverChips data={domain?.status?.nameservers} maxVisible={2} wrap />,
      },
      {
        label: 'Status',
        className: 'px-2',
        content: <DomainStatus domainStatus={domain.status} />,
      },
      {
        label: 'Expiration Date',
        className: 'px-2',
        content: <DomainExpiration expiresAt={domain?.status?.registration?.expiresAt} />,
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: <DateTime className="text-sm" date={domain?.createdAt ?? ''} variant="both" />,
      },
      {
        hidden: !dnsZone,
        label: 'DNS Zone',
        className: 'px-2',
        content: (
          <LinkButton
            type="primary"
            theme="link"
            size="link"
            to={getPathWithParams(paths.project.detail.dnsZones.detail.overview, {
              projectId: projectId ?? '',
              dnsZoneId: dnsZone?.name,
            })}>
            {domain.domainName}
          </LinkButton>
        ),
      },
    ];
  }, [domain, dnsZone]);

  return (
    <Card className="w-full">
      <CardHeader className="px-6">
        <CardTitle className="text-base leading-none font-medium">General</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pt-0 pb-2">
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
