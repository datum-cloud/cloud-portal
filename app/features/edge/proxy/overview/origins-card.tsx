import { FieldLabel } from '@/components/card/field-label';
import { StatusChip } from '@/components/card/status-chip';
import { ValueRow } from '@/components/card/value-row';
import { OsIcon, getOsLabel } from '@/components/icon/os-icon';
import { StatusPulseDot } from '@/components/status-pulse-dot';
import {
  backendTrafficShares,
  loadBalancerLabel,
  summarizeBackends,
} from '@/features/edge/proxy/overview/backend-summary';
import { workloadNameFromNetworkService } from '@/features/edge/proxy/overview/compute-backend';
import { useResolvedComputeWorkload } from '@/features/edge/proxy/overview/use-network-service';
import {
  ProxyBackendsDialog,
  type ProxyBackendsDialogRef,
} from '@/features/edge/proxy/proxy-backends-dialog';
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard';
import type { ComDatumapisNetworkingV1AlphaNetworkService } from '@/modules/control-plane/networking';
import { PermissionButton } from '@/modules/rbac';
import { ControlPlaneStatus } from '@/resources/base';
import { useConnector, useConnectorWatch } from '@/resources/connectors';
import { type HttpProxy, isServiceBackend } from '@/resources/http-proxies';
import { useNetworkServices } from '@/resources/network-services';
import { DATUM_DESKTOP_DOWNLOAD_URL } from '@/utils/config/query.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { isIPAddress } from '@/utils/helpers/validation.helper';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardField,
  CardFieldValue,
  CardHeader,
  CardTitle,
} from '@datum-cloud/datum-ui/card';
import { Icon } from '@datum-cloud/datum-ui/icons';
import { Skeleton } from '@datum-cloud/datum-ui/skeleton';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  ChevronRightIcon,
  LockIcon,
  NetworkIcon,
  PencilIcon,
  ServerIcon,
  ShieldOffIcon,
} from 'lucide-react';
import { useMemo, useRef } from 'react';
import { Link } from 'react-router';

type OriginRow = {
  origin: string;
  scheme: 'https' | 'http' | undefined;
  isIp: boolean;
  /** Set when the backend is a NetworkService rather than a URL. */
  service?: { name: string; port: string };
  /** Raw weight from the spec; unset means the API default of 1. */
  weight?: number;
  /** Fraction of the rule's traffic this backend receives (0 to 1). */
  share?: number;
};

/** Port, workload, and member health for a NetworkService backend row. */
function ServiceChips({
  service,
  details,
}: {
  service: { name: string; port: string };
  details: ComDatumapisNetworkingV1AlphaNetworkService | undefined;
}) {
  const workload = details ? workloadNameFromNetworkService(details) : undefined;
  const summary = details?.status?.summary;
  return (
    <>
      <StatusChip tone="muted" tooltip="NetworkService backend, reached over plain HTTP">
        <Icon icon={NetworkIcon} size={10} aria-hidden="true" />
        Service · {service.port}
      </StatusChip>
      {workload ? <StatusChip tone="muted">Workload {workload}</StatusChip> : null}
      {summary?.members !== undefined ? (
        <StatusChip
          tone={(summary.healthy ?? 0) === 0 ? 'danger' : 'muted'}
          tooltip="Members passing their health checks">
          {summary.healthy ?? 0}/{summary.members} healthy
        </StatusChip>
      ) : !details ? (
        <StatusChip tone="warning" tooltip="This NetworkService wasn't found in the project">
          Not found
        </StatusChip>
      ) : null}
    </>
  );
}

const ADVANCED_ROUTING_HINT =
  'This load balancer splits its backends across several routing rules or uses custom filters, which the portal cannot edit. Change it with datumctl or kubectl.';

function describePassiveHealthCheck(
  passive: NonNullable<NonNullable<HttpProxy['healthCheck']>['passive']>
): string {
  const errors = passive.consecutive5xxErrors ?? 5;
  const ejection = passive.baseEjectionTime ?? '30s';
  const maxPercent = passive.maxEjectionPercent ?? 50;
  return `A backend leaves rotation after ${errors} consecutive 5xx responses, for ${ejection} at first and longer on repeat. At most ${maxPercent}% of backends are out at once.`;
}

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
  className,
}: {
  proxy?: HttpProxy;
  projectId?: string;
  className?: string;
}) => {
  const backendsDialogRef = useRef<ProxyBackendsDialogRef>(null);
  const [, copy, isCopied] = useCopyToClipboard();

  const { data: connector, isLoading: isConnectorLoading } = useConnector(
    projectId ?? '',
    proxy?.connector?.name
  );
  useConnectorWatch(projectId ?? '', proxy?.connector?.name);
  const computeBackend = useResolvedComputeWorkload(projectId, proxy);
  const backendSummary = proxy ? summarizeBackends(proxy, computeBackend.workloadName) : undefined;
  // Compute-created ALBs are editable too: nothing on the compute side
  // reconciles the HTTPProxy after creating it. Advanced routing (several
  // backend rules, custom filters) can't round-trip through the dialog.
  const showOriginEditor = Boolean(proxy && projectId && proxy.complexity !== 'advanced');
  const { data: networkServices = [] } = useNetworkServices(projectId ?? '');
  const servicesByName = useMemo(
    () => new Map(networkServices.map((service) => [service.metadata?.name ?? '', service])),
    [networkServices]
  );

  const origins = useMemo<OriginRow[]>(() => {
    // Prefer the modelled backends: they carry weights. Fall back to the
    // flat origin list for proxies read before the field existed.
    // A lone NetworkService keeps the compute workload view below.
    const backends = proxy?.backends ?? [];
    if (backends.length === 1 && isServiceBackend(backends[0])) return [];
    if (backends.length > 0) {
      const shares = backendTrafficShares(backends);
      return backends.map((backend, index) => ({
        ...(isServiceBackend(backend)
          ? {
              origin: backend.networkService.name,
              scheme: undefined,
              isIp: false,
              service: backend.networkService,
            }
          : parseOrigin(backend.endpoint)),
        weight: backend.weight,
        share: shares[index],
      }));
    }
    const list =
      proxy?.origins && proxy.origins.length > 0
        ? proxy.origins
        : proxy?.endpoint
          ? [proxy.endpoint]
          : [];
    return list.map(parseOrigin);
  }, [proxy?.backends, proxy?.origins, proxy?.endpoint]);

  const multipleBackends = origins.length > 1;
  const balancing = loadBalancerLabel(proxy?.loadBalancer);
  const passiveHealthCheck = proxy?.healthCheck?.passive;
  const isAdvanced = proxy?.complexity === 'advanced';

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
    <Card
      size="sm"
      sectioned
      className={cn('w-full overflow-hidden', className)}
      data-e2e="alb-origins-card">
      <CardHeader size="sm" bordered>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon icon={ServerIcon} size={16} className="text-secondary" />
          {multipleBackends ? `Backends · ${origins.length}` : 'Backend pool'}
        </CardTitle>
        {balancing || passiveHealthCheck ? (
          <CardDescription className="flex flex-wrap items-center gap-1.5 text-xs">
            {balancing ? <span>{balancing}</span> : null}
            {balancing && passiveHealthCheck ? <span aria-hidden="true">·</span> : null}
            {passiveHealthCheck ? (
              <Tooltip message={describePassiveHealthCheck(passiveHealthCheck)}>
                <span className="underline decoration-dotted underline-offset-2">
                  Passive health checks
                </span>
              </Tooltip>
            ) : null}
          </CardDescription>
        ) : null}
        {isAdvanced ? (
          <CardAction>
            <Tooltip message={ADVANCED_ROUTING_HINT}>
              <Text size="xs" textColor="muted" data-e2e="alb-origins-advanced">
                Managed with datumctl
              </Text>
            </Tooltip>
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
              onClick={() => proxy && backendsDialogRef.current?.show(proxy)}>
              <Icon icon={PencilIcon} size={12} />
              Edit backends
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
              onCopy={row.service ? undefined : () => void copy(row.origin, { withToast: true })}
              status={
                <>
                  {row.service ? (
                    <ServiceChips
                      service={row.service}
                      details={servicesByName.get(row.service.name)}
                    />
                  ) : null}
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
                  {multipleBackends && row.share !== undefined ? (
                    <StatusChip
                      tone={row.share === 0 ? 'warning' : 'muted'}
                      tooltip={
                        row.share === 0
                          ? 'Weight 0: this backend receives no traffic'
                          : `Weight ${row.weight ?? 1} of the rule's total`
                      }>
                      {row.share === 0
                        ? 'No traffic'
                        : `${Math.round(row.share * 100)}% of traffic`}
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
        <ProxyBackendsDialog ref={backendsDialogRef} projectId={projectId} />
      ) : null}
    </Card>
  );
};
