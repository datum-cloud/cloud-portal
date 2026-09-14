import { FieldLabel } from '@/components/card/field-label';
import { StatusChip } from '@/components/card/status-chip';
import { ValueRow } from '@/components/card/value-row';
import { OsIcon, getOsLabel } from '@/components/icon/os-icon';
import { StatusPulseDot } from '@/components/status-pulse-dot';
import {
  ProxyOriginsDialog,
  type ProxyOriginsDialogRef,
} from '@/features/edge/proxy/proxy-origins-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { PermissionButton } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { useConnector, useConnectorWatch } from '@/resources/connectors';
import { type HttpProxy } from '@/resources/http-proxies';
import { DATUM_DESKTOP_DOWNLOAD_URL } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import {
  Card,
  CardAction,
  CardContent,
  CardField,
  CardFieldValue,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { LockIcon, PencilIcon, ServerIcon, ShieldOffIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';

type OriginRow = {
  origin: string;
  scheme: 'https' | 'http' | undefined;
  isIp: boolean;
};

function parseOrigin(origin: string): OriginRow {
  try {
    const url = new URL(origin);
    const scheme =
      url.protocol === 'https:' ? 'https' : url.protocol === 'http:' ? 'http' : undefined;
    return { origin, scheme, isIp: isIPAddress(url.hostname) };
  } catch {
    return { origin, scheme: undefined, isIp: false };
  }
}

export const HttpProxyOriginsCard = ({
  proxy,
  projectId,
}: {
  proxy?: HttpProxy;
  projectId?: string;
}) => {
  const originsDialogRef = useRef<ProxyOriginsDialogRef>(null);
  const [, copy, isCopied] = useCopyToClipboard();

  const { data: connector, isLoading: isConnectorLoading } = useConnector(
    projectId ?? '',
    proxy?.connector?.name
  );
  useConnectorWatch(projectId ?? '', proxy?.connector?.name);

  const origins = useMemo<OriginRow[]>(() => {
    const list =
      proxy?.origins && proxy.origins.length > 0
        ? proxy.origins
        : proxy?.endpoint
          ? [proxy.endpoint]
          : [];
    return list.map(parseOrigin);
  }, [proxy?.origins, proxy?.endpoint]);

  const connectorBlock = useMemo(() => {
    if (!proxy?.connector) return null;
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
  }, [proxy?.connector, isConnectorLoading, connector]);

  return (
    <Card size="sm" sectioned className="w-full overflow-hidden" data-e2e="alb-origins-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={ServerIcon} size={16} className="text-secondary" />
          Backend pool
        </CardTitle>
        {proxy && projectId ? (
          <CardAction>
            <PermissionButton
              resource="httpproxies"
              verb="patch"
              group="networking.datumapis.com"
              namespace="default"
              scope="project"
              projectId={projectId}
              deniedReason="You don't have permission to edit this Application Load Balancer"
              type="secondary"
              theme="outline"
              size="xs"
              className="shrink-0"
              onClick={() => originsDialogRef.current?.show(proxy)}>
              <Icon icon={PencilIcon} size={12} />
              Edit origin
            </PermissionButton>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent padding="none">
        {origins.length === 0 ? (
          <div className="text-muted-foreground px-(--card-px) py-3.5 text-sm">
            No origin configured. Add one so this load balancer has somewhere to send traffic.
          </div>
        ) : (
          origins.map((row) => (
            <ValueRow
              key={row.origin}
              value={row.origin}
              copied={isCopied(row.origin)}
              onCopy={() => void copy(row.origin, { withToast: true })}
              status={
                <>
                  {row.scheme === 'https' ? (
                    <StatusChip tone="success" tooltip="Traffic to this origin is encrypted">
                      <Icon icon={LockIcon} size={10} aria-hidden="true" />
                      HTTPS
                    </StatusChip>
                  ) : row.scheme === 'http' ? (
                    <StatusChip
                      tone="warning"
                      tooltip="Traffic between Datum and this origin is not encrypted">
                      <Icon icon={ShieldOffIcon} size={10} aria-hidden="true" />
                      HTTP
                    </StatusChip>
                  ) : null}
                  {row.isIp ? (
                    <StatusChip
                      tone="muted"
                      tooltip="Origin is addressed by IP rather than hostname">
                      IP origin
                    </StatusChip>
                  ) : null}
                </>
              }
            />
          ))
        )}

        {connectorBlock ? (
          <CardField className="sm:items-start">
            <FieldLabel hint="Traffic reaches this origin through a Datum Desktop connector instead of the public internet.">
              Connector
            </FieldLabel>
            <CardFieldValue>{connectorBlock}</CardFieldValue>
          </CardField>
        ) : null}
      </CardContent>
      {proxy && projectId ? (
        <ProxyOriginsDialog ref={originsDialogRef} projectId={projectId} />
      ) : null}
    </Card>
  );
};
