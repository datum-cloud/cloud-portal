import { OsIcon, getOsLabel } from '@/components/icon/os-icon';
import { List, ListItem } from '@/components/list/list';
import { StatusPulseDot } from '@/components/status-pulse-dot';
import {
  ProxyBasicAuthDialog,
  type ProxyBasicAuthDialogRef,
} from '@/features/edge/proxy/proxy-basic-auth-dialog';
import {
  ProxyDisplayNameDialog,
  type ProxyDisplayNameDialogRef,
} from '@/features/edge/proxy/proxy-display-name-dialog';
import { ProxyWafDialog, type ProxyWafDialogRef } from '@/features/edge/proxy/proxy-waf-dialog';
import { ControlPlaneStatus } from '@/resources/base';
import { useConnector, useConnectorWatch } from '@/resources/connectors';
import {
  type HttpProxy,
  formatWafProtectionDisplay,
  useUpdateHttpProxy,
} from '@/resources/http-proxies';
import { DATUM_DESKTOP_DOWNLOAD_URL } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Switch } from '@datum-cloud/datum-ui/switch';
import { toast } from '@datum-cloud/datum-ui/toast';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { CircleHelp, PencilIcon, SettingsIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';

export const HttpProxyConfigCard = ({
  proxy,
  projectId,
}: {
  proxy: HttpProxy;
  projectId?: string;
}) => {
  const displayNameDialogRef = useRef<ProxyDisplayNameDialogRef>(null);
  const wafDialogRef = useRef<ProxyWafDialogRef>(null);
  const basicAuthDialogRef = useRef<ProxyBasicAuthDialogRef>(null);
  const updateMutation = useUpdateHttpProxy(projectId ?? '', proxy.name);
  const { data: connector, isLoading: isConnectorLoading } = useConnector(
    projectId ?? '',
    proxy.connector?.name
  );

  useConnectorWatch(projectId ?? '', proxy.connector?.name);

  const listItems: ListItem[] = useMemo(() => {
    if (!proxy) return [];

    return [
      {
        label: 'Name',
        content: !proxy.chosenName ? (
          <Skeleton className="h-5 w-32 rounded-md" />
        ) : (
          <div className="flex items-center gap-1.5">
            <span className="text-sm">{proxy.chosenName || proxy.name}</span>
            {projectId && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => displayNameDialogRef.current?.show(proxy)}>
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
          proxy.trafficProtectionMode !== 'Disabled' ||
          proxy.paranoiaLevels?.blocking !== undefined ||
          proxy.paranoiaLevels?.detection !== undefined ? (
            <div className="flex items-center gap-1.5">
              <Badge type="quaternary" theme="outline" className="rounded-xl text-xs font-normal">
                {formatWafProtectionDisplay(proxy)}
              </Badge>
              {projectId && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => wafDialogRef.current?.show(proxy)}>
                  <Icon icon={PencilIcon} size={12} />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge type="quaternary" theme="outline" className="rounded-xl text-xs font-normal">
                Disabled
              </Badge>
              {projectId && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => wafDialogRef.current?.show(proxy)}>
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
              message={
                proxy.connector
                  ? 'HTTPS redirect is not available when using a connector'
                  : 'Force all HTTP requests to be redirected to HTTPS using a 301 permanent redirect'
              }
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
          proxy.enableHttpRedirect === undefined ? (
            <Skeleton className="h-6 w-20 rounded-md" />
          ) : (
            <Switch
              key={`force-https-${proxy.enableHttpRedirect ?? false}`}
              checked={proxy.enableHttpRedirect ?? false}
              disabled={!!proxy.connector}
              onCheckedChange={(checked) => {
                if (!checked && proxy.basicAuthEnabled) {
                  toast.warning('AI Edge', {
                    description:
                      'Basic Authentication is enabled. Disabling Force HTTPS will transmit credentials in plaintext.',
                  });
                }
                updateMutation.mutate(
                  {
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
      {
        label: (
          <div className="flex items-center gap-1.5">
            <span>Basic Authentication</span>
            <Tooltip
              message="Restrict access to this proxy with HTTP Basic Authentication"
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
          proxy.basicAuthEnabled === undefined ? (
            <Skeleton className="h-5 w-24 rounded-md" />
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge type="quaternary" theme="outline" className="rounded-xl text-xs font-normal">
                {proxy.basicAuthEnabled
                  ? proxy.basicAuthUserCount
                    ? `${proxy.basicAuthUserCount} user${proxy.basicAuthUserCount !== 1 ? 's' : ''}`
                    : 'Enabled'
                  : 'Disabled'}
              </Badge>
              {projectId && (
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => basicAuthDialogRef.current?.show(proxy)}>
                  <Icon icon={PencilIcon} size={12} />
                </button>
              )}
            </div>
          ),
      },
    ];
  }, [proxy, projectId, updateMutation]);

  const connectorBlock = useMemo(() => {
    if (!proxy.connector) return null;
    if (isConnectorLoading || !connector) return <Skeleton className="h-20 w-full rounded-lg" />;

    const connectorStatus = transformControlPlaneStatus(connector.status);
    const isActive = connectorStatus?.status === ControlPlaneStatus.Success;
    const showDevice = connector.deviceName || connector.deviceOs;

    return (
      <div className="border-primary/25 bg-primary/2 ring-primary/10 flex w-fit flex-col gap-2 rounded-lg border p-3 ring-1 lg:h-20">
        <div className="flex min-w-0 flex-col items-start gap-2 md:flex-row md:items-center">
          <Tooltip message={isActive ? 'Connector is active' : 'Connector is offline'}>
            <StatusPulseDot variant={isActive ? 'active' : 'offline'} />
          </Tooltip>

          {showDevice && (
            <div className="text-primary flex min-w-0 items-center gap-1.5 text-sm">
              <Tooltip
                message={[connector.deviceName, getOsLabel(connector.deviceOs)]
                  .filter(Boolean)
                  .join(' · ')}>
                <span className="flex min-w-0 flex-col items-start gap-2 lg:flex-row lg:items-center">
                  <span className="flex min-w-0 items-center gap-1.5">
                    {connector.deviceOs && (
                      <OsIcon os={connector.deviceOs} size={14} className="shrink-0" />
                    )}
                    {connector.deviceName ?? getOsLabel(connector.deviceOs)}
                  </span>
                  <span className="text-primary/80 text-xs">{connector.name}</span>
                </span>
              </Tooltip>
            </div>
          )}
        </div>
        <p className="text-primary/70 mt-1 p-0 text-xs">
          Connector created via{' '}
          <a
            href={DATUM_DESKTOP_DOWNLOAD_URL}
            className="underline"
            target="_blank"
            rel="noreferrer">
            Datum Desktop
          </a>
        </p>
      </div>
    );
  }, [proxy.connector, isConnectorLoading, connector]);

  return (
    <Card className="h-full w-full overflow-hidden rounded-xl px-3 py-4 shadow sm:pt-6 sm:pb-4">
      <CardContent className="p-0 sm:px-6 sm:pb-4">
        <div className="mb-4 flex items-center gap-2.5">
          <Icon icon={SettingsIcon} size={20} className="text-secondary stroke-2" />
          <span className="text-base font-semibold">Configuration</span>
        </div>
        <List items={listItems} />
        {connectorBlock && <div className="mt-4">{connectorBlock}</div>}
      </CardContent>
      {projectId && (
        <>
          <ProxyWafDialog ref={wafDialogRef} projectId={projectId} />
          <ProxyDisplayNameDialog ref={displayNameDialogRef} projectId={projectId} />
          <ProxyBasicAuthDialog ref={basicAuthDialogRef} projectId={projectId} />
        </>
      )}
    </Card>
  );
};
