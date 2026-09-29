import { FieldLabel } from '@/components/card/field-label';
import { StatusChip } from '@/components/card/status-chip';
import { ValueRow } from '@/components/card/value-row';
import { OsIcon, getOsLabel } from '@/components/icon/os-icon';
import { StatusPulseDot } from '@/components/status-pulse-dot';
import { toBackendRows } from '@/features/edge/proxy/backends/backend-pool';
import { useComputeServiceInfo } from '@/features/edge/proxy/backends/use-compute-service-info';
import { summarizeBackends } from '@/features/edge/proxy/overview/backend-summary';
import { isComputeBackend } from '@/features/edge/proxy/overview/compute-backend';
import { useResolvedComputeWorkload } from '@/features/edge/proxy/overview/use-network-service';
import {
  ProxyOriginsDialog,
  type ProxyOriginsDialogRef,
} from '@/features/edge/proxy/proxy-origins-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import { PermissionButton } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { useConnector, useConnectorWatch } from '@/resources/connectors';
import { type HttpProxy } from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { DATUM_DESKTOP_DOWNLOAD_URL } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import { LinkButton } from '@datum-cloud/datum-ui/button';
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
import { Text } from '@datum-cloud/datum-ui/typography';
import { ChevronRightIcon, LockIcon, PencilIcon, ServerIcon, ShieldOffIcon } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Link } from 'react-router';

type OriginRow = {
  origin: string;
  scheme: 'https' | 'http' | undefined;
  isIp: boolean;
  /** Set for a backend with no endpoint URL (compute, VPC), named by its resource. */
  kindLabel?: string;
  copyable: boolean;
};

function parseOrigin(origin: string): OriginRow {
  try {
    const url = new URL(origin);
    const scheme =
      url.protocol === 'https:' ? 'https' : url.protocol === 'http:' ? 'http' : undefined;
    return { origin, scheme, isIp: isIPAddress(url.hostname), copyable: true };
  } catch {
    return { origin, scheme: undefined, isIp: false, copyable: true };
  }
}

function BackendRow({ title, label }: { title: string; label: string }) {
  return (
    <>
      <span className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-md">
        <Icon icon={ServerIcon} size={14} className="text-muted-foreground" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <Text weight="medium">{title}</Text>
        <Text size="xs" textColor="muted" ellipsis className="font-mono">
          {label}
        </Text>
      </span>
    </>
  );
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
  const computeBackend = useResolvedComputeWorkload(projectId, proxy);
  const backendSummary = proxy ? summarizeBackends(proxy, computeBackend.workloadName) : undefined;
  // A compute backend is managed from the workload side — except once its
  // workload is gone, when an origin is the only way to route traffic again.
  // Saving an endpoint replaces the NetworkService backend (see the update adapter).
  const showOriginEditor = Boolean(
    proxy && projectId && (!isComputeBackend(proxy) || computeBackend.workloadMissing)
  );
  // The single-origin editor would replace the whole pool; a weighted pool is
  // managed on the Backends tab instead.
  const multiBackend = (proxy?.backends?.length ?? 0) > 1;
  const backendsHref =
    proxy && projectId
      ? getPathWithParams(paths.project.detail.proxy.detail.backends, {
          projectId,
          proxyId: proxy.name,
        })
      : undefined;

  // Only worth fetching when a pool has a workload backend to describe.
  const computeServices = useComputeServiceInfo(
    projectId,
    (proxy?.backends ?? []).some((backend) => backend.kind === 'networkService')
  );
  const origins = useMemo<OriginRow[]>(() => {
    // A pool lists every backend: origins only holds endpoint URLs, so a
    // compute or VPC backend would otherwise go missing from the card.
    if ((proxy?.backends?.length ?? 0) > 1) {
      return toBackendRows(proxy?.backends, { services: computeServices }).map((row) =>
        row.backend.endpoint
          ? parseOrigin(row.backend.endpoint)
          : {
              origin: row.title,
              scheme: undefined,
              isIp: false,
              kindLabel: row.kindLabel,
              copyable: false,
            }
      );
    }
    const list =
      proxy?.origins && proxy.origins.length > 0
        ? proxy.origins
        : proxy?.endpoint
          ? [proxy.endpoint]
          : [];
    return list.map(parseOrigin);
  }, [proxy?.backends, proxy?.origins, proxy?.endpoint, computeServices]);

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
            <Text as="div" textColor="primary" className="flex min-w-0 items-center gap-1.5">
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
                  <Text size="xs" className="text-primary/80">
                    {connector.name}
                  </Text>
                </span>
              </Tooltip>
            </Text>
          )}
        </div>
        <Text as="p" size="xs" className="text-primary/70 mt-1 p-0">
          Connector created via{' '}
          <a
            href={DATUM_DESKTOP_DOWNLOAD_URL}
            className="underline"
            target="_blank"
            rel="noreferrer">
            Datum Desktop
          </a>
        </Text>
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
        {multiBackend && backendsHref ? (
          <CardAction>
            <LinkButton
              as={Link}
              href={backendsHref}
              type="secondary"
              theme="outline"
              size="xs"
              className="shrink-0">
              Manage backends
              <Icon icon={ChevronRightIcon} size={12} />
            </LinkButton>
          </CardAction>
        ) : showOriginEditor ? (
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
              onClick={() => proxy && originsDialogRef.current?.show(proxy)}>
              <Icon icon={PencilIcon} size={12} />
              {computeBackend.workloadMissing ? 'Set origin' : 'Edit origin'}
            </PermissionButton>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent padding="none">
        {origins.length === 0 && computeBackend.isLoading ? (
          <Skeleton className="mx-(--card-px) my-3.5 h-10 w-full rounded-md" />
        ) : origins.length === 0 && backendSummary && backendSummary.count != null ? (
          computeBackend.href ? (
            <Link
              to={computeBackend.href}
              className="hover:bg-muted/40 flex items-center gap-3 px-(--card-px) py-3 transition-colors"
              data-e2e="alb-origins-compute-workload">
              <BackendRow
                title={backendSummary.workloadName ? 'Compute workload' : 'Backend'}
                label={backendSummary.label}
              />
              <Icon icon={ChevronRightIcon} size={16} className="text-muted-foreground shrink-0" />
            </Link>
          ) : (
            // No compute plugin registered, the workload is still unresolved, or
            // it was deleted: show the backend without a dead link.
            <div
              className="flex items-center gap-3 px-(--card-px) py-3"
              data-e2e="alb-origins-compute-workload">
              <BackendRow
                title={
                  computeBackend.workloadMissing
                    ? 'Compute workload not found'
                    : backendSummary.workloadName
                      ? 'Compute workload'
                      : 'Backend'
                }
                label={backendSummary.label}
              />
            </div>
          )
        ) : origins.length === 0 ? (
          <Text as="div" textColor="muted" className="px-(--card-px) py-3.5">
            No origin configured. Add one so this load balancer has somewhere to send traffic.
          </Text>
        ) : (
          origins.map((row, index) => (
            <ValueRow
              key={`${index}-${row.origin}`}
              value={row.origin}
              copied={isCopied(row.origin)}
              onCopy={row.copyable ? () => void copy(row.origin, { withToast: true }) : undefined}
              status={
                <>
                  {row.kindLabel ? <StatusChip tone="muted">{row.kindLabel}</StatusChip> : null}
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
