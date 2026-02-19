import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { useProxyHealthCheck } from '@/features/edge/proxy/hooks/use-proxy-health-check';
import { ControlPlaneStatus } from '@/resources/base';
import { type HttpProxy, formatWafProtectionDisplay } from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getShortId } from '@/utils/helpers/text.helper';
import { Badge, Button, Card, CardContent, Tooltip } from '@datum-ui/components';
import { SpinnerIcon } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Skeleton } from '@shadcn/ui/skeleton';
import { CircleHelp, PencilIcon, RefreshCw, SquareLibrary } from 'lucide-react';
import { useMemo, useEffect, useState } from 'react';

export const HttpProxyGeneralCard = ({
  httpProxy,
  onEdit,
}: {
  httpProxy: HttpProxy;
  onEdit?: () => void;
}) => {
  const [hostname, setHostname] = useState<string | undefined>(httpProxy.status?.hostnames?.[0]);
  const { isChecking, result, performCheck } = useProxyHealthCheck();

  // Perform health check on mount and when hostname changes
  useEffect(() => {
    if (hostname) {
      performCheck(hostname);
    }
  }, [hostname]); // Only depend on hostname to re-check when it changes

  // Check if proxy is still being created (Pending status)
  const isPending = useMemo(() => {
    if (!httpProxy?.status) return true;
    const transformedStatus = transformControlPlaneStatus(httpProxy.status);
    return transformedStatus.status === ControlPlaneStatus.Pending;
  }, [httpProxy?.status]);

  useEffect(() => {
    if (httpProxy.status?.hostnames) {
      setHostname(httpProxy.status.hostnames[0]);
    }
  }, [httpProxy.status?.hostnames]);

  const listItems: ListItem[] = useMemo(() => {
    if (!httpProxy) return [];

    // Order items for grid layout (fills row by row, so interleave columns)
    // Column 1: Status, Resource name, UID, Created At
    // Column 2: Origin, Protection, Health Check, HTTP Redirect
    return [
      // Row 1
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
      // Row 2
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
            <span>Protection</span>
            <Tooltip
              message="What level of WAF protection is applied to this AI Edge"
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
          isPending && !httpProxy.trafficProtectionMode ? (
            <Skeleton className="h-5 w-24 rounded-md" />
          ) : (
            <Badge
              type="quaternary"
              theme="outline"
              className="rounded-xl text-xs font-normal capitalize">
              {formatWafProtectionDisplay(httpProxy)}
            </Badge>
          ),
      },
      // Row 3
      {
        label: (
          <div className="flex items-center gap-1.5">
            <span>UID</span>
            <Tooltip
              message="Unique identifier for this AI Edge"
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
          isPending && !httpProxy.uid ? (
            <Skeleton className="h-6 w-24 rounded-md" />
          ) : (
            <BadgeCopy
              value={httpProxy.uid ?? ''}
              text={getShortId(httpProxy.uid ?? '')}
              badgeType="muted"
              badgeTheme="solid"
            />
          ),
      },
      {
        label: (
          <div className="flex items-center gap-1.5">
            <span>Health Check</span>
            <Tooltip
              message="Click the badge to perform a health check and verify if the AI Edge proxy is responding"
              side="bottom"
              contentClassName="max-w-xs text-wrap">
              <Icon
                icon={CircleHelp}
                className="text-muted-foreground size-3.5 shrink-0 cursor-help"
              />
            </Tooltip>
          </div>
        ),

        content: isPending ? (
          <Skeleton className="h-6 w-24 rounded-md" />
        ) : (
          <div
            className="flex cursor-pointer items-center gap-2"
            onClick={() => performCheck(hostname)}>
            {result ? (
              <BadgeStatus
                className="cursor-pointer"
                status={{
                  status: result.success ? ControlPlaneStatus.Success : ControlPlaneStatus.Error,
                  message: result.success ? 'Healthy' : 'Unhealthy',
                }}
                label={result.success ? 'Healthy' : 'Unhealthy'}
              />
            ) : (
              <BadgeStatus
                className="cursor-pointer"
                status={{
                  status: ControlPlaneStatus.Pending,
                  message: isChecking ? 'Checking...' : 'Click to refresh',
                }}
                label={isChecking ? 'Checking...' : 'Not checked'}
              />
            )}

            {isChecking ? (
              <SpinnerIcon size="sm" className="animate-spin" />
            ) : (
              <Icon icon={RefreshCw} size={16} />
            )}
          </div>
        ),
      },
      // Row 4
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
      {
        label: (
          <div className="flex items-center gap-1.5">
            <span>Force HTTPS</span>
            <Tooltip
              message="Is force HTTPS enabled for this AI Edge"
              side="bottom"
              contentClassName="max-w-xs text-wrap">
              <Icon
                icon={CircleHelp}
                className="text-muted-foreground size-3.5 shrink-0 cursor-help"
              />
            </Tooltip>
          </div>
        ),
        hidden: isPending ? false : httpProxy.enableHttpRedirect === undefined,
        content:
          isPending && httpProxy.enableHttpRedirect === undefined ? (
            <Skeleton className="h-6 w-20 rounded-md" />
          ) : (
            <BadgeStatus
              status={{
                status: httpProxy.enableHttpRedirect
                  ? ControlPlaneStatus.Success
                  : ControlPlaneStatus.Error,
                message: httpProxy.enableHttpRedirect
                  ? 'Force HTTPS is enabled for this AI Edge'
                  : 'Force HTTPS is disabled for this AI Edge',
              }}
              label={httpProxy.enableHttpRedirect ? 'Enabled' : 'Disabled'}
            />
          ),
      },
    ];
  }, [httpProxy, hostname, result, isChecking, performCheck, isPending]);

  return (
    <Card className="w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="p-0 sm:px-6 sm:pb-4">
        <div className="mb-4 flex items-center gap-2.5">
          <Icon icon={SquareLibrary} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold"> General</span>
          {onEdit && (
            <Button
              htmlType="button"
              type="primary"
              theme="solid"
              size="xs"
              className="ml-auto"
              onClick={onEdit}
              disabled={isPending}>
              <Icon icon={PencilIcon} size={12} />
              Edit
            </Button>
          )}
        </div>
        <List items={listItems} className="grid grid-cols-1 gap-x-12 xl:grid-cols-2" />
      </CardContent>
    </Card>
  );
};
