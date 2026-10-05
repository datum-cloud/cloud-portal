import { summarizeBackends } from './backend-summary';
import { TRAFFIC_PRESENCE_WINDOW_LABEL } from './use-alb-traffic-presence';
import { useResolvedComputeWorkload } from './use-network-service';
import { usePoolBackends } from './use-pool-backends';
import type { BackendRow } from '@/features/edge/proxy/backends/backend-pool';
import { ControlPlaneStatus } from '@/resources/base';
import {
  type HttpProxy,
  getCertificatesReadyCondition,
  getCertificatesReadyDisplay,
} from '@/resources/http-proxies';
import { paths } from '@/utils/config/paths.config';
import { transformControlPlaneStatus } from '@/utils/helpers/control-plane.helper';
import { getPathWithParams } from '@/utils/helpers/path.helper';
import { Badge } from '@datum-cloud/datum-ui/badge';
import { Card, CardContent } from '@datum-cloud/datum-ui/card';
import { Icon, SpinnerIcon } from '@datum-cloud/datum-ui/icons';
import { Tooltip } from '@datum-cloud/datum-ui/tooltip';
import { Text } from '@datum-cloud/datum-ui/typography';
import { cn } from '@datum-cloud/datum-ui/utils';
import {
  CircleCheckIcon,
  LockIcon,
  RadioIcon,
  ServerIcon,
  ShieldCheckIcon,
  ShieldIcon,
  ShieldOffIcon,
  SquareLibrary,
  TriangleAlertIcon,
} from 'lucide-react';
import { useMemo, type ReactNode } from 'react';
import { Link } from 'react-router';

interface HttpProxyHealthStripProps {
  proxy: HttpProxy;
  projectId: string;
  /** Whether the viewer can read the TrafficProtectionPolicy at all. */
  canViewWaf: boolean;
  wafPending: boolean;
  wafUnavailable: boolean;
  /** No requests in the presence lookback; swaps the "serving" headline for a first-run one. */
  idle?: boolean;
}

/** Proxies younger than this with no traffic are "waiting for the first request". */
const FIRST_REQUEST_AGE_MS = 24 * 60 * 60 * 1000;

type Tone = 'success' | 'warning' | 'danger' | 'muted';

function Chip({
  tone,
  icon,
  children,
  tooltip,
}: {
  tone: Tone;
  icon: typeof ServerIcon;
  children: ReactNode;
  tooltip?: ReactNode;
}) {
  const badge = (
    <Badge
      type={tone}
      // Muted/light is near-invisible in light mode; solid muted stays legible.
      theme={tone === 'muted' ? 'solid' : 'light'}
      className="h-6 gap-1.5 rounded-md px-2 text-xs font-medium whitespace-nowrap">
      <Icon icon={icon} size={12} className="shrink-0" />
      {children}
    </Badge>
  );
  return tooltip ? <Tooltip message={tooltip}>{badge}</Tooltip> : badge;
}

/** Each backend in the pool with its share of traffic, for the backend count chip. */
function PoolBackendList({ rows }: { rows: BackendRow[] }) {
  return (
    <ul className="flex flex-col gap-1 py-0.5">
      {rows.map((row) => (
        <li key={row.index} className="flex items-center justify-between gap-4">
          <span className="min-w-0 truncate font-mono">{row.title}</span>
          <span className="shrink-0 opacity-70">
            {row.workloadMissing ? 'Deleted' : row.drained ? 'No traffic' : row.shareLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Full-width status summary for the ALB overview. Everything here is derived
 * from resource status the portal already has; there is no per-target health
 * or incident feed on HTTPProxy yet, so those are deliberately absent.
 */
export function HttpProxyHealthStrip({
  proxy,
  projectId,
  canViewWaf,
  wafPending,
  wafUnavailable,
  idle = false,
}: HttpProxyHealthStripProps) {
  const status = useMemo(() => transformControlPlaneStatus(proxy.status), [proxy.status]);
  const certDisplay = useMemo(
    () => getCertificatesReadyDisplay(getCertificatesReadyCondition(proxy.status)),
    [proxy.status]
  );

  const backends = summarizeBackends(proxy);
  const computeBackend = useResolvedComputeWorkload(projectId, proxy);
  const pool = usePoolBackends(projectId, proxy);
  // In a pool the workload label only names the workload that publishes the
  // ALB, one backend of several, so the strip doesn't speak for it.
  const workloadName = pool.isPool
    ? undefined
    : (computeBackend.workloadName ?? backends.workloadName);
  const workloadMissing = !pool.isPool && computeBackend.workloadMissing;
  const poolUnavailable = pool.unavailable.length;
  const backendsHref = getPathWithParams(paths.project.detail.proxy.detail.backends, {
    projectId,
    proxyId: proxy.name,
  });
  const hostnameCount = proxy.hostnames?.length ?? 0;
  const wafMode = proxy.trafficProtectionMode;

  const headline = (() => {
    switch (status.status) {
      case ControlPlaneStatus.Success:
        if (workloadMissing) {
          return {
            icon: (
              <Icon icon={TriangleAlertIcon} size={18} className="text-(--color-badge-warning)" />
            ),
            title: 'No backend available',
            detail: `Workload ${workloadName} was deleted. Redeploy it to reconnect.`,
            ring: 'bg-(--color-badge-warning)/10',
          };
        }
        if (poolUnavailable > 0) {
          const all = pool.rows.every((row) => row.workloadMissing || row.drained);
          const names = pool.unavailable.map((row) => row.title);
          return {
            icon: (
              <Icon icon={TriangleAlertIcon} size={18} className="text-(--color-badge-warning)" />
            ),
            title: all
              ? 'No backend available'
              : `${poolUnavailable} of ${pool.rows.length} backends unavailable`,
            detail:
              poolUnavailable === 1
                ? `Workload ${names[0]} was deleted. Its share of requests fails until you redeploy it or remove it from the pool.`
                : `Workloads ${names.join(', ')} were deleted. Their share of requests fails until you redeploy them or remove them from the pool.`,
            ring: 'bg-(--color-badge-warning)/10',
          };
        }
        if (idle) {
          const createdAt = proxy.createdAt?.getTime();
          const isNew = createdAt == null || Date.now() - createdAt < FIRST_REQUEST_AGE_MS;
          return {
            icon: <Icon icon={RadioIcon} size={18} className="text-(--color-badge-info)" />,
            title: isNew
              ? 'Waiting for the first request'
              : `No traffic in the ${TRAFFIC_PRESENCE_WINDOW_LABEL}`,
            detail:
              'Your load balancer is live. Point DNS at the default hostname, or add a custom hostname, to start receiving traffic.',
            ring: 'bg-(--color-badge-info)/10',
          };
        }
        return {
          icon: <Icon icon={CircleCheckIcon} size={18} className="text-(--color-badge-success)" />,
          title: 'Serving traffic normally',
          detail: [
            backends.count == null
              ? null
              : `${backends.count} ${backends.count === 1 ? 'backend' : 'backends'}`,
            `${hostnameCount} custom ${hostnameCount === 1 ? 'hostname' : 'hostnames'}`,
          ]
            .filter(Boolean)
            .join(' · '),
          ring: 'bg-(--color-badge-success)/10',
        };
      case ControlPlaneStatus.Error:
        return {
          icon: <Icon icon={TriangleAlertIcon} size={18} className="text-(--color-badge-danger)" />,
          title: 'Configuration failed to program',
          detail: status.message || 'Check the Configuration tab for details.',
          ring: 'bg-(--color-badge-danger)/10',
        };
      default:
        return {
          icon: <SpinnerIcon size="sm" aria-hidden="true" />,
          title: 'Programming edge configuration',
          detail: status.message || 'Hostnames, DNS, and certificates are being provisioned.',
          ring: 'bg-(--color-badge-info)/10',
        };
    }
  })();

  const wafChip = (() => {
    if (!canViewWaf) return null;
    if (wafPending) {
      return (
        <Chip tone="muted" icon={ShieldIcon}>
          <SpinnerIcon size="xs" aria-hidden="true" />
          WAF
        </Chip>
      );
    }
    if (wafUnavailable) {
      return (
        <Chip tone="muted" icon={ShieldIcon} tooltip="WAF status could not be loaded">
          WAF unknown
        </Chip>
      );
    }
    if (wafMode === 'Enforce') {
      return (
        <Chip
          tone="success"
          icon={ShieldCheckIcon}
          tooltip="Requests matching OWASP rules are blocked">
          WAF enforced
        </Chip>
      );
    }
    if (wafMode === 'Observe') {
      return (
        <Chip tone="warning" icon={ShieldIcon} tooltip="Matches are logged but not blocked">
          WAF observe
        </Chip>
      );
    }
    return (
      <Chip tone="muted" icon={ShieldOffIcon} tooltip="No traffic protection policy">
        WAF off
      </Chip>
    );
  })();

  const tlsChip = (() => {
    if (certDisplay === 'ready') {
      return (
        <Chip tone="success" icon={LockIcon} tooltip="All hostnames have issued certificates">
          TLS ready
        </Chip>
      );
    }
    if (certDisplay === 'failed') {
      return (
        <Chip tone="danger" icon={LockIcon} tooltip="At least one certificate failed to issue">
          TLS failed
        </Chip>
      );
    }
    if (certDisplay === 'pending') {
      return (
        <Chip tone="warning" icon={LockIcon} tooltip="Certificates are still being issued">
          <SpinnerIcon size="xs" aria-hidden="true" />
          TLS issuing
        </Chip>
      );
    }
    return null;
  })();

  return (
    <Card size="sm" data-e2e="alb-health-strip">
      <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex size-9 shrink-0 items-center justify-center rounded-full',
              headline.ring
            )}>
            {headline.icon}
          </span>
          <div className="flex min-w-0 flex-col">
            <Text weight="semibold" ellipsis>
              {headline.title}
            </Text>
            <Text size="xs" textColor="muted" ellipsis>
              {headline.detail}
            </Text>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {poolUnavailable > 0 ? (
            <Link to={backendsHref} className="inline-flex" data-e2e="alb-health-manage-backends">
              <Chip
                tone="muted"
                icon={ServerIcon}
                tooltip="Redeploy the deleted workloads, or remove them from the pool">
                Manage backends
              </Chip>
            </Link>
          ) : workloadName && workloadMissing ? (
            // The headline already says the workload is gone; the chip is the way out.
            <Link
              to={`${getPathWithParams(paths.project.detail.proxy.detail.configuration, {
                projectId,
                proxyId: proxy.name,
              })}#backends`}
              className="inline-flex"
              data-e2e="alb-health-set-origin">
              <Chip
                tone="muted"
                icon={ServerIcon}
                tooltip={`Send this load balancer's traffic to another origin, or redeploy ${workloadName}`}>
                Set origin
              </Chip>
            </Link>
          ) : workloadName && computeBackend.href ? (
            <Link
              to={computeBackend.href}
              className="inline-flex"
              data-e2e="alb-health-compute-workload">
              <Chip tone="muted" icon={SquareLibrary} tooltip={`${workloadName}`}>
                View workload
              </Chip>
            </Link>
          ) : workloadName ? (
            <Chip tone="muted" icon={SquareLibrary} tooltip="Compute workload">
              Workload: {workloadName}
            </Chip>
          ) : backends.count != null ? (
            <Chip
              tone="muted"
              icon={ServerIcon}
              tooltip={pool.rows.length > 0 ? <PoolBackendList rows={pool.rows} /> : undefined}>
              {backends.count} {backends.count === 1 ? 'backend' : 'backends'}
            </Chip>
          ) : null}
          {wafChip}
          {tlsChip}
        </div>
      </CardContent>
    </Card>
  );
}
