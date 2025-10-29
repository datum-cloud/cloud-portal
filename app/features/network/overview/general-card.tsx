import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { TextCopy } from '@/components/text-copy/text-copy';
import { Badge } from '@/modules/datum-ui/components/badge.tsx';
import { Card, CardHeader, CardTitle, CardContent } from '@/modules/shadcn/ui/components/card';
import { INetworkControlResponse } from '@/resources/interfaces/network.interface';
import { getShortId } from '@/utils/helpers/text.helper';
import { useMemo } from 'react';

export const NetworkGeneralCard = ({ network }: { network: INetworkControlResponse }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!network) return [];

    return [
      {
        label: 'Name',
        className: 'px-2',
        content: <TextCopy className="text-sm" value={network.name ?? ''} text={network.name} />,
      },
      {
        label: 'UID',
        className: 'px-2',
        content: (
          <TextCopy
            className="text-sm"
            value={network.uid ?? ''}
            text={getShortId(network.uid ?? '')}
          />
        ),
      },
      {
        label: 'Namespace',
        className: 'px-2',
        content: <span>{network.namespace}</span>,
      },
      {
        label: 'IP Family',
        className: 'px-2',
        content: (
          <div className="flex flex-wrap gap-1">
            {network.ipFamilies?.map((ipFamily) => (
              <Badge key={ipFamily} variant={ipFamily === 'IPv4' ? 'outline' : 'default'}>
                {ipFamily}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        label: 'IPAM',
        className: 'px-2',
        content: <span>{network.ipam?.mode}</span>,
      },
      {
        label: 'MTU',
        className: 'px-2',
        content: <span>{network.mtu}</span>,
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: <DateTime className="text-sm" date={network?.createdAt ?? ''} variant="both" />,
      },
    ];
  }, [network]);

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
