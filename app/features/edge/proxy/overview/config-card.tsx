import { List, ListItem } from '@/components/list/list';
import {
  ProxyDisplayNameDialog,
  type ProxyDisplayNameDialogRef,
} from '@/features/edge/proxy/proxy-display-name-dialog';
import { ProxyWafDialog, type ProxyWafDialogRef } from '@/features/edge/proxy/proxy-waf-dialog';
import { ControlPlaneStatus } from '@/resources/base';
import {
  type HttpProxy,
  formatWafProtectionDisplay,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Badge, Card, CardContent, toast, Tooltip } from '@datum-ui/components';
import { Icon } from '@datum-ui/components/icons/icon-wrapper';
import { Skeleton } from '@shadcn/ui/skeleton';
import { Switch } from '@shadcn/ui/switch';
import { CircleHelp, PencilIcon, SettingsIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';

export const HttpProxyConfigCard = ({
  httpProxy,
  projectId,
}: {
  httpProxy: HttpProxy;
  projectId?: string;
}) => {
  console.log('httpProxy', httpProxy);
  const wafDialogRef = useRef<ProxyWafDialogRef>(null);
  const displayNameDialogRef = useRef<ProxyDisplayNameDialogRef>(null);
  const updateMutation = useUpdateHttpProxy(projectId ?? '', httpProxy.name);

  const isPending = useMemo(() => {
    if (!httpProxy?.status) return true;
    const transformedStatus = transformControlPlaneStatus(httpProxy.status);
    return transformedStatus.status === ControlPlaneStatus.Pending;
  }, [httpProxy?.status]);

  const listItems: ListItem[] = useMemo(() => {
    if (!httpProxy) return [];

    return [
      {
        label: 'Name',
        content:
          isPending && !httpProxy.chosenName ? (
            <Skeleton className="h-5 w-32 rounded-md" />
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{httpProxy.chosenName || httpProxy.name}</span>
              {projectId && !isPending && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => displayNameDialogRef.current?.show(httpProxy)}>
                  <Icon icon={PencilIcon} size={12} />
                </button>
              )}
            </div>
          ),
      },
      {
        label: (
          <div className="flex items-center gap-1.5">
            <span>Protection</span>
            <Tooltip
              message="WAF protection mode and paranoia level applied to this AI Edge"
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
            <div className="flex items-center gap-1.5">
              <Badge type="quaternary" theme="outline" className="rounded-xl text-xs font-normal">
                {formatWafProtectionDisplay(httpProxy)}
              </Badge>
              {projectId && !isPending && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => wafDialogRef.current?.show(httpProxy)}>
                  <Icon icon={PencilIcon} size={12} />
                </button>
              )}
            </div>
          ),
      },
      {
        label: (
          <div className="flex items-center gap-1.5">
            <span>Force HTTPS</span>
            <Tooltip
              message="Force all HTTP requests to be redirected to HTTPS using a 301 permanent redirect"
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
          isPending && httpProxy.enableHttpRedirect === undefined ? (
            <Skeleton className="h-6 w-20 rounded-md" />
          ) : (
            <Switch
              key={`force-https-${httpProxy.enableHttpRedirect ?? false}`}
              checked={httpProxy.enableHttpRedirect ?? false}
              disabled={isPending}
              onCheckedChange={(checked) => {
                updateMutation.mutate(
                  {
                    endpoint: httpProxy.endpoint,
                    enableHttpRedirect: checked,
                  },
                  {
                    onSuccess: () => {
                      toast.success('AI Edge', {
                        description: `Force HTTPS ${checked ? 'enabled' : 'disabled'}`,
                      });
                    },
                    onError: (error) => {
                      toast.error('AI Edge', {
                        description: (error as Error).message || 'Failed to update Force HTTPS',
                      });
                    },
                  }
                );
              }}
            />
          ),
      },
    ];
  }, [httpProxy, isPending, projectId]);

  return (
    <Card className="h-full w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="p-0 sm:px-6 sm:pb-4">
        <div className="mb-4 flex items-center gap-2.5">
          <Icon icon={SettingsIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Configuration</span>
        </div>
        <List items={listItems} />
      </CardContent>
      {projectId && (
        <>
          <ProxyWafDialog ref={wafDialogRef} projectId={projectId} />
          <ProxyDisplayNameDialog ref={displayNameDialogRef} projectId={projectId} />
        </>
      )}
    </Card>
  );
};
