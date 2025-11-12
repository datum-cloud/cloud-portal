import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { StatusBadge } from '@/components/status-badge/status-badge';
import { TextCopy } from '@/components/text-copy/text-copy';
import { ControlPlaneStatus } from '@/resources/interfaces/control-plane.interface';
import { IHttpProxyControlResponse } from '@/resources/interfaces/http-proxy.interface';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Card, CardHeader, CardTitle, CardContent } from '@datum-ui/components';
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
        content: <span>{httpProxy.namespace}</span>,
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
        content: (() => {
          const transformedStatus = transformControlPlaneStatus(httpProxy.status);
          return (
            <StatusBadge
              status={transformedStatus}
              label={transformedStatus.status === ControlPlaneStatus.Success ? 'Active' : undefined}
            />
          );
        })(),
      },
      {
        label: 'Created At',
        className: 'px-2',
        content: <DateTime className="text-sm" date={httpProxy?.createdAt ?? ''} variant="both" />,
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
