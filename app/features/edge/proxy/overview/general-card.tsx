import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { ControlPlaneStatus } from '@/resources/base';
import { type HttpProxy } from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getShortId } from '@/utils/helpers/text.helper';
import { Button, Card, CardContent } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { PencilIcon } from 'lucide-react';
import { useMemo } from 'react';

export const HttpProxyGeneralCard = ({
  httpProxy,
  onEdit,
}: {
  httpProxy: HttpProxy;
  onEdit?: () => void;
}) => {
  const listItems: ListItem[] = useMemo(() => {
    if (!httpProxy) return [];

    return [
      {
        label: 'Resource Name',
        content: (
          <BadgeCopy
            value={httpProxy.name ?? ''}
            text={httpProxy.name}
            badgeType="muted"
            badgeTheme="solid"
          />
        ),
      },
      {
        label: 'UID',
        content: (
          <BadgeCopy
            value={httpProxy.uid ?? ''}
            text={getShortId(httpProxy.uid ?? '')}
            badgeType="muted"
            badgeTheme="solid"
          />
        ),
      },
      {
        label: 'Namespace',
        content: <span className="capitalize">{httpProxy.namespace}</span>,
      },
      {
        label: 'Endpoint',
        content: httpProxy.endpoint ? (
          <a href={httpProxy.endpoint} target="_blank" rel="noopener noreferrer">
            {httpProxy.endpoint}
          </a>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
      },
      {
        label: 'TLS Hostname',
        hidden: !httpProxy.tlsHostname,
        content: <span>{httpProxy.tlsHostname ?? ''}</span>,
      },
      {
        label: 'Status',
        content: (() => {
          const transformedStatus = transformControlPlaneStatus(httpProxy.status);
          return (
            <BadgeStatus
              status={transformedStatus}
              label={transformedStatus.status === ControlPlaneStatus.Success ? 'Active' : undefined}
            />
          );
        })(),
      },
      {
        label: 'Created At',
        content: <DateTime className="text-sm" date={httpProxy?.createdAt ?? ''} variant="both" />,
      },
    ];
  }, [httpProxy]);

  return (
    <Card className="w-full p-0 shadow-md">
      <CardContent className="px-9 py-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-base font-semibold">General</span>
          {onEdit && (
            <Button htmlType="button" type="primary" theme="solid" size="xs" onClick={onEdit}>
              <Icon icon={PencilIcon} size={12} />
              Edit
            </Button>
          )}
        </div>
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
