import {
  HTTP_PROXY_DEFAULT_WEIGHT,
  HTTP_PROXY_MAX_BACKENDS,
  PASSIVE_HEALTH_CHECK_DEFAULTS,
  type HttpProxy,
  type HttpProxyBackend,
  type HttpProxyBackendInput,
  type HttpProxyLoadBalancer,
  type HttpProxyLoadBalancerType,
  type HttpProxyPassiveHealthCheck,
} from '@/resources/http-proxies';
import { isIPAddress } from '@/utils/helpers/validation.helper';

/**
 * Passive health checks are hidden for now: on staging the HTTPProxy's
 * healthCheck reaches a BackendTrafficPolicy but never the edge's Envoy
 * clusters (no tenant cluster reports outlier-detection stats), so a failing
 * endpoint is never ejected. Showing the setting would promise behaviour the
 * platform doesn't deliver. Flip this once ejection is confirmed working.
 */
export const SHOW_HEALTH_CHECKS = false;

/** Stacked-bar and legend colours, in backend order. Repeats past five. */
export const BACKEND_COLORS = [
  'var(--primary)',
  'var(--color-chart-2)',
  'var(--color-chart-4)',
  'var(--color-chart-3)',
  'var(--color-chart-5)',
] as const;

export function backendColor(index: number): string {
  return BACKEND_COLORS[index % BACKEND_COLORS.length];
}

export interface BackendRow {
  /** Stable across renders: spec order is the only identity a backend has. */
  index: number;
  backend: HttpProxyBackend;
  /** Primary label: the origin's hostname, or the referenced resource. */
  title: string;
  /** Secondary label: the full endpoint URL, or what's behind a workload or VPC backend. */
  address: string;
  kindLabel?: string;
  /** Where the title links: a compute workload's page, when the plugin is mounted. */
  href?: string;
  /** The compute workload behind a workload backend, once its service is resolved. */
  workloadName?: string;
  /**
   * That workload was deleted while the pool still references it, so its
   * share of requests has nowhere to go. Only set when the caller checked.
   */
  workloadMissing: boolean;
  /** Reached over Galactic VPC (a workload's or instance's network), not the public internet. */
  privateNetwork?: boolean;
  scheme?: 'http' | 'https';
  isIp: boolean;
  weight: number;
  /** Share of the rule's traffic, 0–100. */
  share: number;
  /** `share` as shown: rounded with the rest of the pool so the labels total 100%. */
  shareLabel: string;
  drained: boolean;
  color: string;
  /**
   * The backend a compute workload publishes its URL through. Every deploy
   * points it back at the workload's HTTP port, and puts it back if it's gone,
   * so its target and its place in the pool aren't the portal's to change.
   */
  workloadOwned: boolean;
}

/**
 * What the portal knows about the compute service behind a workload backend,
 * keyed by service name. Resolved by the caller (useComputeServiceInfo) so this
 * module stays free of data fetching.
 */
export type ComputeServiceInfo = {
  workloadName?: string;
  healthy?: number;
  members?: number;
  locations: string[];
  /** Port numbers by name; a backend references one by name. */
  ports: Readonly<Record<string, number>>;
  href?: string;
};

export type BackendRowContext = {
  services?: ReadonlyMap<string, ComputeServiceInfo>;
  /** The workload that manages the proxy, when one does. */
  managingWorkload?: string;
  /** Workloads known to be deleted (useMissingComputeWorkloads). */
  missingWorkloads?: ReadonlySet<string>;
};

/** Why the managing workload's own backend can't be repointed or removed. */
export const WORKLOAD_BACKEND_REASON =
  'Each deploy points this backend at its workload’s HTTP port, so only its weight can change here.';

/**
 * A workload names the NetworkService behind its URL after itself (compute's
 * url.ResourceName), which is how a deploy finds its backend in the pool.
 */
export function isWorkloadOwnedBackend(
  backend: HttpProxyBackend,
  managingWorkload: string | undefined
): boolean {
  return (
    !!managingWorkload &&
    backend.kind === 'networkService' &&
    backend.networkService?.name === managingWorkload
  );
}

/** "3/3 instances healthy · us-central-1 · port 3000", from what's known. */
export function describeComputeService(
  info: ComputeServiceInfo | undefined,
  portName: string | undefined
): string {
  const parts: string[] = [];
  if (info?.members !== undefined) {
    parts.push(
      info.members === 0
        ? 'No instances'
        : `${info.healthy ?? 0}/${info.members} ${info.members === 1 ? 'instance' : 'instances'} healthy`
    );
  }
  if (info && info.locations.length > 0) {
    parts.push(
      info.locations.length <= 2 ? info.locations.join(', ') : `${info.locations.length} locations`
    );
  }
  const port = (portName && info?.ports[portName]) ?? portName;
  if (port !== undefined) parts.push(`port ${port}`);
  return parts.join(' · ') || 'Datum compute';
}

function parseUrl(endpoint: string | undefined): URL | undefined {
  if (!endpoint) return undefined;
  try {
    return new URL(endpoint);
  } catch {
    return undefined;
  }
}

function describe(
  backend: HttpProxyBackend,
  context: BackendRowContext
): Pick<
  BackendRow,
  'title' | 'address' | 'kindLabel' | 'scheme' | 'isIp' | 'href' | 'privateNetwork'
> &
  Partial<Pick<BackendRow, 'workloadName' | 'workloadMissing'>> {
  const url = parseUrl(backend.endpoint);
  const scheme =
    url?.protocol === 'https:' ? 'https' : url?.protocol === 'http:' ? 'http' : undefined;
  const isIp = url ? isIPAddress(url.hostname) : false;

  switch (backend.kind) {
    case 'networkService': {
      // Named by the workload, not the NetworkService behind it, which isn't
      // something users create or see.
      const name = backend.networkService?.name;
      const info = name ? context.services?.get(name) : undefined;
      const workloadName = info?.workloadName;
      const workloadMissing = !!workloadName && !!context.missingWorkloads?.has(workloadName);
      return {
        title: workloadName ?? name ?? 'Workload',
        address: describeComputeService(info, backend.networkService?.port),
        kindLabel: 'Workload',
        // A deleted workload's page would 404.
        href: workloadMissing ? undefined : info?.href,
        privateNetwork: true,
        isIp: false,
        workloadName,
        workloadMissing,
      };
    }
    case 'instance':
      return {
        title: backend.instance?.name ?? 'Instance',
        address: `Galactic VPC · port ${backend.instance?.port ?? '—'}`,
        kindLabel: 'Instance',
        privateNetwork: true,
        isIp: false,
      };
    case 'connector':
      return {
        title: url?.host ?? backend.endpoint ?? 'Connector',
        address: backend.endpoint ?? '',
        kindLabel: `Connector · ${backend.connector?.name}`,
        scheme,
        isIp,
      };
    default:
      return {
        title: url?.host ?? backend.endpoint ?? 'Origin',
        address: backend.endpoint ?? '',
        scheme,
        isIp,
      };
  }
}

/** Shares by weight. When every weight is 0 nothing is routable, so all shares are 0. */
export function weightShares(weights: number[]): number[] {
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => (total > 0 ? (weight / total) * 100 : 0));
}

/**
 * Starting weight for a new backend: the mean of the weighted backends, so it
 * joins with an even share instead of a sliver (1 beside two 50s is <1%).
 */
export function suggestedWeight(backends: HttpProxyBackend[] | undefined): number {
  const weights = (backends ?? []).map((b) => b.weight).filter((w) => w > 0);
  if (weights.length === 0) return HTTP_PROXY_DEFAULT_WEIGHT;
  return Math.max(1, Math.round(weights.reduce((sum, w) => sum + w, 0) / weights.length));
}

export function formatShare(share: number): string {
  if (share === 0) return '0%';
  if (share < 1) return '<1%';
  return `${Math.round(share)}%`;
}

/**
 * Whole-percent labels that add up to 100%. Rounding each share on its own
 * can show 38% + 63% for a 37.5/62.5 split; largest-remainder rounding gives
 * the leftover points to the shares closest to rounding up. A share that
 * still rounds to 0 is shown as "<1%" so it doesn't read as drained.
 */
export function shareLabels(shares: number[]): string[] {
  const floors = shares.map((share) => Math.floor(share));
  const total = shares.reduce((sum, share) => sum + share, 0);
  let leftover = total > 0 ? 100 - floors.reduce((sum, n) => sum + n, 0) : 0;
  const byRemainder = shares
    .map((share, index) => ({ index, remainder: share - floors[index] }))
    .sort((a, b) => b.remainder - a.remainder);
  const rounded = [...floors];
  for (const { index } of byRemainder) {
    if (leftover <= 0) break;
    rounded[index] += 1;
    leftover -= 1;
  }
  return rounded.map((value, index) => (value === 0 && shares[index] > 0 ? '<1%' : `${value}%`));
}

export function toBackendRows(
  backends: HttpProxyBackend[] | undefined,
  context: BackendRowContext = {}
): BackendRow[] {
  const list = backends ?? [];
  const shares = weightShares(list.map((b) => b.weight));
  const labels = shareLabels(shares);
  return list.map((backend, index) => ({
    index,
    backend,
    workloadMissing: false,
    ...describe(backend, context),
    weight: backend.weight,
    share: shares[index],
    shareLabel: labels[index],
    drained: backend.weight === 0,
    color: backendColor(index),
    workloadOwned: isWorkloadOwnedBackend(backend, context.managingWorkload),
  }));
}

/** Re-emit the pool with one entry replaced, removed, or appended. */
export function poolWith(
  backends: HttpProxyBackend[] | undefined,
  change:
    | { type: 'add'; backend: HttpProxyBackendInput }
    | { type: 'replace'; index: number; backend: HttpProxyBackendInput }
    | { type: 'remove'; index: number }
): HttpProxyBackendInput[] {
  const current: HttpProxyBackendInput[] = (backends ?? []).map((b) => ({ raw: b.raw }));
  switch (change.type) {
    case 'add':
      return [...current, change.backend];
    case 'replace':
      return current.map((b, i) => (i === change.index ? change.backend : b));
    case 'remove':
      return current.filter((_, i) => i !== change.index);
  }
}

/**
 * Why the pool can't be edited from the portal, or undefined when it can: a
 * shape the rules rebuild would change or the API would reject.
 *
 * A workload-managed proxy is editable. Deploys only repoint the workload's
 * own backend and set the hostnames, keeping everything else (compute #395).
 */
export function poolLockReason(proxy: HttpProxy): string | undefined {
  if (proxy.complexity === 'advanced') {
    return 'This load balancer uses routing rules or backend filters the portal can’t edit without changing them. Manage it with datumctl or kubectl.';
  }
  return undefined;
}

/** Why a backend can't be added, or undefined when one can. */
export function addBackendBlockReason(proxy: HttpProxy): string | undefined {
  const backends = proxy.backends ?? [];
  if (backends.some((b) => b.kind === 'connector')) {
    return 'A connector backend must be the only backend on its load balancer.';
  }
  if (backends.length >= HTTP_PROXY_MAX_BACKENDS) {
    return `A load balancer can have up to ${HTTP_PROXY_MAX_BACKENDS} backends.`;
  }
  return undefined;
}

/**
 * A rule-level Host override sends the same Host to every origin. Origins
 * that route by hostname (Vercel, Fly.io, Netlify…) then answer each other's
 * requests with 404s, so flag it once the pool spans more than one hostname.
 */
export function hostOverrideConflict(proxy: HttpProxy): boolean {
  if (!proxy.hostHeader) return false;
  const hosts = new Set(
    (proxy.backends ?? [])
      .map((b) => parseUrl(b.endpoint)?.hostname)
      .filter((host): host is string => !!host)
  );
  return hosts.size > 1;
}

export type AlgorithmValue = HttpProxyLoadBalancerType;

/**
 * What an unset `spec.loadBalancer` does. The operator attaches no policy, and
 * Envoy Gateway then falls back to least request (the nil branch in
 * internal/xds/translator/cluster.go), so the portal shows that rather than a
 * "Default" option. Display only: viewing the page never writes it.
 */
export const DEFAULT_ALGORITHM: AlgorithmValue = 'LeastRequest';

/** Hints stay short enough to sit on one line at the menu's width. */
export const ALGORITHM_OPTIONS: Array<{
  value: AlgorithmValue;
  label: string;
  description: string;
}> = [
  { value: 'RoundRobin', label: 'Round robin', description: 'Cycles through backends in order' },
  { value: 'LeastRequest', label: 'Least request', description: 'Fewest requests in flight wins' },
  { value: 'Random', label: 'Random', description: 'Picks a backend at random' },
  {
    value: 'ConsistentHash',
    label: 'Consistent hash',
    description: 'A client sticks to one backend',
  },
];

export function algorithmValue(lb: HttpProxyLoadBalancer | undefined): AlgorithmValue {
  return lb?.type ?? DEFAULT_ALGORITHM;
}

export function algorithmLabel(lb: HttpProxyLoadBalancer | undefined): string {
  const option = ALGORITHM_OPTIONS.find((o) => o.value === algorithmValue(lb));
  if (lb?.type === 'ConsistentHash') {
    const hash = lb.consistentHash;
    return hash?.type === 'Header' ? `Consistent hash · ${hash.header}` : 'Consistent hash · IP';
  }
  return option?.label ?? 'Least request';
}

/** Passive settings with the API defaults filled in for display. */
export function resolvedPassive(
  passive: HttpProxyPassiveHealthCheck | undefined
): Required<HttpProxyPassiveHealthCheck> | undefined {
  if (!passive) return undefined;
  return {
    consecutive5xxErrors:
      passive.consecutive5xxErrors ?? PASSIVE_HEALTH_CHECK_DEFAULTS.consecutive5xxErrors,
    baseEjectionTime: passive.baseEjectionTime ?? PASSIVE_HEALTH_CHECK_DEFAULTS.baseEjectionTime,
    maxEjectionPercent:
      passive.maxEjectionPercent ?? PASSIVE_HEALTH_CHECK_DEFAULTS.maxEjectionPercent,
  };
}

const DURATION_UNITS: Record<string, string> = { ms: 'ms', s: 'second', m: 'minute', h: 'hour' };

/** "30s" → "30 seconds". Falls back to the raw value for compound durations. */
export function formatDuration(value: string): string {
  const match = value.match(/^(\d+)(ms|s|m|h)$/);
  if (!match) return value;
  const amount = Number(match[1]);
  const unit = DURATION_UNITS[match[2]];
  if (unit === 'ms') return `${amount} ms`;
  return `${amount} ${unit}${amount === 1 ? '' : 's'}`;
}

/** Gateway API Duration: one or more `<int><unit>` groups, e.g. 30s, 1m30s. */
export const GATEWAY_DURATION_PATTERN = /^([0-9]{1,5}(h|m|s|ms)){1,4}$/;
