import { BadgeCopy } from '@/components/badge/badge-copy';
import { BadgeStatus } from '@/components/badge/badge-status';
import { DateTime } from '@/components/date-time';
import { List, ListItem } from '@/components/list/list';
import { useProxyPending } from '@/features/edge/proxy/hooks/use-proxy-pending';
import { ControlPlaneStatus } from '@/resources/base';
import {
  type HttpProxy,
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
} from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import {
  CircleHelp,
  ShieldCheckIcon,
  ShieldOffIcon,
  SquareLibrary,
  TriangleAlertIcon,
} from 'lucide-react';
import { useMemo } from 'react';

const DNS_PROPAGATION_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export const HttpProxyGeneralCard = ({ proxy }: { proxy: HttpProxy }) => {
  const hostname = useMemo(
    () => proxy.canonicalHostname ?? proxy.status?.hostnames?.[0],
    [proxy.canonicalHostname, proxy.status?.hostnames]
  );

  const isPending = useProxyPending(proxy?.status);

  // The operator sets Available=True as soon as the DNS record is programmed,
  // not after it has propagated globally. Use a time window instead — the component
  // re-renders via the K8s watch so the warning clears naturally once the window passes.
  const isDnsPropagating = useMemo(() => {
    if (!proxy.createdAt || isPending) return false;
    const ageMs = Date.now() - new Date(proxy.createdAt).getTime();
    return ageMs < DNS_PROPAGATION_WINDOW_MS;
  }, [proxy.createdAt, isPending]);

  const listItems: ListItem[] = useMemo(() => {
    if (!proxy) return [];

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
          const transformedStatus = transformControlPlaneStatus(proxy.status);
          return (
            <BadgeStatus
              status={transformedStatus}
              label={transformedStatus.status === ControlPlaneStatus.Success ? 'Active' : undefined}
            />
          );
        })(),
      },
      ...((): ListItem[] => {
        const certCondition = getCertificatesReadyCondition(proxy?.status);
        const certDisplay = getCertificatesReadyDisplay(certCondition);
        return [
          {
            label: (
              <div className="flex items-center gap-1.5">
                <span>TLS Certificates</span>
                <Tooltip
                  message="Whether TLS certificates are ready for all HTTPS hostnames"
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
              certDisplay === undefined ? (
                <Skeleton className="h-7 w-24 rounded-md" />
              ) : certDisplay === 'ready' ? (
                <BadgeStatus
                  status={{
                    status: ControlPlaneStatus.Success,
                    message: certCondition?.message || 'All certificates ready',
                  }}
                  showIcon={true}
                  customIcon={<Icon icon={ShieldCheckIcon} size={12} className="shrink-0" />}
                  label="Ready"
                />
              ) : certDisplay === 'failed' ? (
                <BadgeStatus
                  status={{
                    status: ControlPlaneStatus.Error,
                    message: certCondition?.message || 'One or more certificates failed',
                  }}
                  showIcon={true}
                  customIcon={<Icon icon={ShieldOffIcon} size={12} className="shrink-0" />}
                  label="Failed"
                />
              ) : (
                <BadgeStatus
                  status={{
                    status: ControlPlaneStatus.Pending,
                    message: certCondition?.message || 'Certificates pending',
                  }}
                  showIcon={true}
                  customIcon={<Icon icon={ShieldOffIcon} size={12} className="shrink-0" />}
                  label="Pending"
                />
              ),
          },
        ];
      })(),
      {
        label: 'Resource Name',
        content:
          isPending && !proxy.name ? (
            <Skeleton className="h-7 w-32 rounded-md" />
          ) : (
            <BadgeCopy
              value={proxy.name ?? ''}
              text={proxy.name}
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
            <Skeleton className="h-7 w-48 rounded-md" />
          ) : hostname ? (
            <div className="flex items-center gap-2">
              <BadgeCopy
                value={`https://${hostname}`}
                text={hostname}
                badgeType="muted"
                badgeTheme="solid"
                textClassName="truncate max-w-[250px]"
              />
              {isDnsPropagating && (
                <Tooltip
                  message="DNS changes can take a few minutes to propagate globally"
                  side="right"
                  contentClassName="max-w-xs text-wrap">
                  <div className="flex items-center gap-1 text-[11px] font-medium text-(--color-badge-warning)">
                    <Icon icon={TriangleAlertIcon} size={12} className="shrink-0" />
                  </div>
                </Tooltip>
              )}
            </div>
          ) : null,
      },
      {
        label: 'Created At',
        content:
          isPending && !proxy?.createdAt ? (
            <Skeleton className="h-5 w-32 rounded-md" />
          ) : (
            <DateTime
              className="text-left text-sm"
              date={proxy?.createdAt ?? ''}
              variant="detailed"
            />
          ),
      },
    ];
  }, [proxy, hostname, isPending, isDnsPropagating]);

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
