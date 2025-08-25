import { DateFormat } from '@/components/date-format/date-format';
import { List, ListItem } from '@/components/list/list';
import { TextCopy } from '@/components/text-copy/text-copy';
import { TimeDistance } from '@/components/time-distance/time-distance';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { DomainStatus } from '@/features/edge/domain/status';
import { IDomainControlResponse } from '@/resources/interfaces/domain.interface';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const DomainGeneralCard = ({ domain }: { domain: IDomainControlResponse }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!domain) return [];

    return [
      {
        label: 'Name',
        className: 'px-2',
        content: <TextCopy className="text-sm" value={domain.name ?? ''} text={domain.name} />,
      },
      {
        label: 'Namespace',
        className: 'px-2',
        content: <span>{domain.namespace}</span>,
      },
      {
        label: 'Domain',
        className: 'px-2',
        content: (
          <Link to={domain.domainName ?? ''} target="_blank">
            {domain.domainName}
          </Link>
        ),
      },
      {
        label: 'Status',
        className: 'px-2',
        content: <DomainStatus domainStatus={domain.status} />,
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: (
          <div className="flex items-center gap-1">
            <DateFormat className="text-sm" date={domain?.createdAt ?? ''} />
            <TimeDistance date={domain?.createdAt ?? ''} className="text-sm" />
          </div>
        ),
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
