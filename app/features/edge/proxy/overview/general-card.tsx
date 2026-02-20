import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { ControlPlaneStatus } from '@/resources/base';
import { type HttpProxy } from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Card, CardContent, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Skeleton } from '@shadcn/ui/skeleton';
import { CircleHelp, SquareLibrary } from 'lucide-react';
import { useMemo } from 'react';

export const HttpProxyGeneralCard = ({ httpProxy }: { httpProxy: HttpProxy }) => {
  const hostname = useMemo(
    () => httpProxy.canonicalHostname ?? httpProxy.status?.hostnames?.[0],
    [httpProxy.canonicalHostname, httpProxy.status?.hostnames]
  );

  const isPending = useMemo(() => {
    if (!httpProxy?.status) return true;
    const transformedStatus = transformControlPlaneStatus(httpProxy.status);
    return transformedStatus.status === ControlPlaneStatus.Pending;
  }, [httpProxy?.status]);

  const listItems: ListItem[] = useMemo(() => {
    if (!httpProxy) return [];

    return [
      {
        label: (
          <div className="flex items-center gap-1.5">
            <span>Status</span>
            <Tooltip
              message="Has the Edge been successfully deployed and is active"
              side="bottom"
              contentClassName="max-w-xs text-wrap">
              <Icon
                icon={CircleHelp}
                className="text-muted-foreground size-3.5 shrink-0 cursor-help"
              />
            </Tooltip>
          </div>
        ),
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
        label: 'Resource Name',
        content:
          isPending && !httpProxy.name ? (
            <Skeleton className="h-6 w-32 rounded-md" />
          ) : (
            <BadgeCopy
              value={httpProxy.name ?? ''}
              text={httpProxy.name}
              badgeType="muted"
              badgeTheme="solid"
            />
          ),
      },
      {
        label: (
          <div className="flex items-center gap-1.5">
            <span>Default Hostname</span>
            <Tooltip
              message="The hostname automatically assigned by Datum when your AI Edge is created"
              side="bottom"
              contentClassName="max-w-xs text-wrap">
              <Icon
                icon={CircleHelp}
                className="text-muted-foreground size-3.5 shrink-0 cursor-help"
              />
            </Tooltip>
          </div>
        ),
        content:
          isPending && !hostname ? (
            <Skeleton className="h-6 w-48 rounded-md" />
          ) : hostname ? (
            <BadgeCopy
              value={hostname}
              text={hostname}
              badgeType="muted"
              badgeTheme="solid"
              textClassName="truncate max-w-[250px]"
            />
          ) : null,
      },
      {
        label: 'Created At',
        content:
          isPending && !httpProxy?.createdAt ? (
            <Skeleton className="h-5 w-32 rounded-md" />
          ) : (
            <DateTime
              className="text-left text-sm"
              date={httpProxy?.createdAt ?? ''}
              variant="detailed"
            />
          ),
      },
    ];
  }, [httpProxy, hostname, isPending]);

  return (
    <Card className="h-full w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="p-0 sm:px-6 sm:pb-4">
        <div className="mb-4 flex items-center gap-2.5">
          <Icon icon={SquareLibrary} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">General</span>
        </div>
        <List items={listItems} />
      </CardContent>
    </Card>
  );
};
