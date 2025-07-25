import { DateFormat } from '@/components/date-format/date-format';
import { List, ListItem } from '@/components/list/list';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { TextCopy } from '@/components/text-copy/text-copy';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { transformControlPlaneStatus } from '@/utils/misc';
import { formatDistanceToNow } from 'date-fns';
import { useMemo } from 'react';
import { Link } from 'react-router';

export const HttpProxyGeneralCard = ({ httpProxy }: { httpProxy: IHttpProxyControlResponse }) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!httpProxy) return [];

    return [
      {
        label: 'Name',
        className: 'px-2',
        content: (
          <TextCopy className="text-sm" value={httpProxy.name ?? ''} text={httpProxy.name} />
        ),
      },
      {
        label: 'Namespace',
        className: 'px-2',
        content: <span className="capitalize">{httpProxy.namespace}</span>,
      },
      {
        label: 'Endpoint',
        className: 'px-2',
        content: (
          <Link to={httpProxy.endpoint ?? ''} target="_blank">
            {httpProxy.endpoint}
          </Link>
        ),
      },
      {
        label: 'Status',
        className: 'px-2',
        content: (
          <StatusBadge
            status={transformControlPlaneStatus(httpProxy.status)}
            type="badge"
            readyText="Active"
            badgeClassName="px-0"
          />
        ),
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: (
          <div className="flex items-center gap-1">
            <DateFormat className="text-sm" date={httpProxy?.createdAt ?? ''} />
            <span className="text-sm">
              (
              {formatDistanceToNow(new Date(httpProxy?.createdAt ?? ''), {
                addSuffix: true,
              })}
              )
            </span>
          </div>
        ),
      },
    ];
  }, [httpProxy]);

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
