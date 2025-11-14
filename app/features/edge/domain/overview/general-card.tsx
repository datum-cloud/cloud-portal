import { DateTime } from '@/components/date-time';
import { DnsHostChips } from '@/components/dns-host-chips';
import { List, ListItem } from '@/components/list/list';
import { TextCopy } from '@/components/text-copy/text-copy';
import { DomainExpiration } from '@/features/edge/domain/expiration';
import { DomainStatus } from '@/features/edge/domain/status';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { Card, CardHeader, CardTitle, CardContent } from '@datum-ui/components';
import { useMemo } from 'react';

export const DomainGeneralCard = ({ domain }: { domain: IDomainControlResponse }) => {
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
        content: <DnsHostChips data={domain?.status?.nameservers} maxVisible={2} wrap />,
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
    ];
  }, [domain]);

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
