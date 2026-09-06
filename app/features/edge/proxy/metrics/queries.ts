/**
 * Shared PromQL for Application Load Balancer telemetry.
 *
 * Known VictoriaMetrics series (no in-repo catalog; these are the only names
 * the portal and assistant tools query today):
 *   - envoy_vhost_vcluster_upstream_rq
 *   - envoy_vhost_vcluster_upstream_rq_time_bucket
 *   - coraza_envoy_filter_request_events_total
 *
 * Byte / connection Envoy series (envoy_cluster_*, envoy_http_downstream_*)
 * are not referenced anywhere in this repo and are not charted until a live
 * __name__ discovery confirms they exist for a gateway.
 */
import {
  buildHistogramQuantileQuery,
  buildPrometheusLabelSelector,
  buildRateQuery,
  createRegionFilter,
  type PrometheusLabelFilter,
} from '@/modules/metrics';
import type { QueryBuilderContext } from '@/modules/metrics';
import { resolveChartStep } from '@/modules/metrics/utils/chart-axis';
import { formatDurationFromMs } from '@/modules/metrics/utils/date-parsers';

export const ENVOY_RQ_METRIC = 'envoy_vhost_vcluster_upstream_rq';
export const ENVOY_RQ_TIME_METRIC = 'envoy_vhost_vcluster_upstream_rq_time_bucket';
export const CORAZA_EVENTS_METRIC = 'coraza_envoy_filter_request_events_total';

export const REGION_LABEL = 'label_topology_kubernetes_io_region';
export const STATUS_CLASS_FILTER_KEY = 'statusClass';
export const WAF_OUTCOME_FILTER_KEY = 'wafOutcome';
export const WAF_SEVERITY_FILTER_KEY = 'wafSeverity';

export const RESPONSE_CODE_COLORS: Record<string, string> = {
  '2XX': 'var(--color-chart-2)',
  '3XX': 'var(--color-chart-4)',
  '4XX': 'var(--color-chart-1)',
  '5XX': 'var(--color-chart-3)',
};

export const OUTCOME_LABELS: Record<string, string> = {
  allowed: 'Allowed',
  blocked: 'Blocked',
  dropped: 'Dropped',
};

export const OUTCOME_COLORS: Record<string, string> = {
  allowed: 'var(--color-chart-2)',
  blocked: 'var(--color-chart-1)',
  dropped: 'var(--color-chart-4)',
};

export const QUANTILE_COLORS: Record<string, string> = {
  p50: 'var(--color-chart-4)',
  p95: 'var(--primary)',
  p99: 'var(--color-chart-1)',
};

export const STATUS_CLASS_OPTIONS = [
  { label: '2XX', value: '2XX' },
  { label: '3XX', value: '3XX' },
  { label: '4XX', value: '4XX' },
  { label: '5XX', value: '5XX' },
] as const;

const STATUS_CLASS_PATTERN: Record<string, string> = {
  '2XX': '2..',
  '3XX': '3..',
  '4XX': '4..',
  '5XX': '5..',
};

export interface AlbQueryScope {
  projectId: string;
  proxyId: string;
  regions?: string | string[] | null;
  statusClasses?: string | string[] | null;
  wafOutcomes?: string | string[] | null;
  wafSeverities?: string | string[] | null;
  requireRegion?: boolean;
  includeNamespace?: boolean;
  customLabels?: Record<string, string>;
}

export function albBaseLabels(
  projectId: string,
  proxyId: string,
  includeNamespace = true
): Record<string, string> {
  return {
    resourcemanager_datumapis_com_project_name: projectId,
    gateway_name: proxyId,
    ...(includeNamespace ? { gateway_namespace: 'default' } : {}),
  };
}

export function albSeriesMatch(projectId: string, proxyId: string): string {
  return `{resourcemanager_datumapis_com_project_name="${projectId}",gateway_name="${proxyId}"}`;
}

export function toStatusClassPatterns(
  statusClasses: string | string[] | null | undefined
): string[] {
  const values = Array.isArray(statusClasses)
    ? statusClasses
    : statusClasses
      ? [statusClasses]
      : [];
  return values.map((value) => STATUS_CLASS_PATTERN[value] ?? '').filter(Boolean);
}

export function createStatusClassFilter(
  statusClasses: string | string[] | null | undefined
): PrometheusLabelFilter {
  return {
    label: 'envoy_response_code',
    value: toStatusClassPatterns(statusClasses),
  };
}

export function createMultiValueFilter(
  label: string,
  value: string | string[] | null | undefined
): PrometheusLabelFilter {
  return { label, value };
}

export function resetGuardedIncrease(metric: string, selector: string, window: string): string {
  const series = `${metric}${selector}`;
  return `(increase(${series}[${window}]) * (resets(${series}[${window}]) == bool 0))`;
}

export function windowDuration(ctx: QueryBuilderContext): string {
  return formatDurationFromMs(ctx.timeRange.end.getTime() - ctx.timeRange.start.getTime());
}

export function stepOr(ctx: QueryBuilderContext, fallback = 'auto'): string {
  const raw = ctx.filters.step ?? ctx.step ?? fallback;
  const rangeMs = ctx.timeRange.end.getTime() - ctx.timeRange.start.getTime();
  return resolveChartStep(raw, rangeMs);
}

function trafficSelector(scope: AlbQueryScope): string {
  const requireRegion = scope.requireRegion ?? true;
  return buildPrometheusLabelSelector({
    baseLabels: albBaseLabels(scope.projectId, scope.proxyId, scope.includeNamespace ?? true),
    customLabels: {
      ...(requireRegion ? { [REGION_LABEL]: '!=""' } : {}),
      ...scope.customLabels,
    },
    filters: [createRegionFilter(scope.regions), createStatusClassFilter(scope.statusClasses)],
  });
}

function wafSelector(scope: AlbQueryScope): string {
  const requireRegion = scope.requireRegion ?? true;
  return buildPrometheusLabelSelector({
    baseLabels: albBaseLabels(scope.projectId, scope.proxyId, false),
    customLabels: {
      ...(requireRegion ? { [REGION_LABEL]: '!=""' } : {}),
      ...scope.customLabels,
    },
    filters: [
      createRegionFilter(scope.regions),
      createMultiValueFilter('coraza_outcome', scope.wafOutcomes),
      createMultiValueFilter('coraza_rule_severity', scope.wafSeverities),
    ],
  });
}

export function scopeFromContext(
  ctx: QueryBuilderContext,
  projectId: string,
  proxyId: string,
  extras?: Partial<AlbQueryScope>
): AlbQueryScope {
  return {
    projectId,
    proxyId,
    regions: ctx.get('regions'),
    statusClasses: ctx.get(STATUS_CLASS_FILTER_KEY),
    wafOutcomes: ctx.get(WAF_OUTCOME_FILTER_KEY),
    wafSeverities: ctx.get(WAF_SEVERITY_FILTER_KEY),
    ...extras,
  };
}

export function albRpsQuery(scope: AlbQueryScope, timeWindow: string): string {
  return buildRateQuery({
    metric: ENVOY_RQ_METRIC,
    timeWindow,
    baseLabels: albBaseLabels(scope.projectId, scope.proxyId, scope.includeNamespace ?? true),
    customLabels: {
      ...(scope.requireRegion === false ? {} : { [REGION_LABEL]: '!=""' }),
      ...scope.customLabels,
    },
    filters: [createRegionFilter(scope.regions), createStatusClassFilter(scope.statusClasses)],
    groupBy: [],
  });
}

export function albRpsByClassQuery(scope: AlbQueryScope, timeWindow: string): string {
  const selector = trafficSelector(scope);
  return (
    `sum by (envoy_response_code_class) (` +
    `label_replace(` +
    `rate(${ENVOY_RQ_METRIC}${selector}[${timeWindow}]),` +
    `"envoy_response_code_class","$\{1}XX","envoy_response_code","([0-9]).*"` +
    `))`
  );
}

export function albRpsByStatusCodeQuery(scope: AlbQueryScope, timeWindow: string): string {
  return buildRateQuery({
    metric: ENVOY_RQ_METRIC,
    timeWindow,
    baseLabels: albBaseLabels(scope.projectId, scope.proxyId),
    customLabels: { [REGION_LABEL]: '!=""', ...scope.customLabels },
    filters: [createRegionFilter(scope.regions), createStatusClassFilter(scope.statusClasses)],
    groupBy: ['envoy_response_code'],
  });
}

export function albErrorRpsQuery(scope: AlbQueryScope, timeWindow: string): string {
  return buildRateQuery({
    metric: ENVOY_RQ_METRIC,
    timeWindow,
    baseLabels: albBaseLabels(scope.projectId, scope.proxyId),
    customLabels: {
      [REGION_LABEL]: '!=""',
      envoy_response_code: '=~"[45].."',
      ...scope.customLabels,
    },
    filters: [createRegionFilter(scope.regions), createStatusClassFilter(scope.statusClasses)],
    groupBy: [],
  });
}

export function albErrorRateQuery(scope: AlbQueryScope, timeWindow: string): string {
  const errors = albErrorRpsQuery(scope, timeWindow);
  const total = albRpsQuery({ ...scope, statusClasses: undefined }, timeWindow);
  return `${errors} / ${total}`;
}

export function albLatencyQuantileQuery(
  quantile: number,
  scope: AlbQueryScope,
  timeWindow: string
): string {
  return buildHistogramQuantileQuery({
    quantile,
    metric: ENVOY_RQ_TIME_METRIC,
    timeWindow,
    baseLabels: albBaseLabels(scope.projectId, scope.proxyId),
    customLabels: { [REGION_LABEL]: '!=""', ...scope.customLabels },
    filters: [createRegionFilter(scope.regions)],
    groupBy: ['le'],
  });
}

export function albLatencyPercentilesQuery(scope: AlbQueryScope, timeWindow: string): string {
  const quantiles: Array<[number, string]> = [
    [0.5, 'p50'],
    [0.95, 'p95'],
    [0.99, 'p99'],
  ];
  return quantiles
    .map(
      ([quantile, name]) =>
        `label_replace(${albLatencyQuantileQuery(quantile, scope, timeWindow)},"quantile","${name}","","")`
    )
    .join(' or ');
}

export function albRegionalRpsQuery(scope: AlbQueryScope, timeWindow: string): string {
  return buildRateQuery({
    metric: ENVOY_RQ_METRIC,
    timeWindow,
    baseLabels: albBaseLabels(scope.projectId, scope.proxyId),
    customLabels: { [REGION_LABEL]: '!=""', ...scope.customLabels },
    filters: [createRegionFilter(scope.regions), createStatusClassFilter(scope.statusClasses)],
    groupBy: [REGION_LABEL],
  });
}

export function albRegionalErrorRpsQuery(scope: AlbQueryScope, timeWindow: string): string {
  return buildRateQuery({
    metric: ENVOY_RQ_METRIC,
    timeWindow,
    baseLabels: albBaseLabels(scope.projectId, scope.proxyId),
    customLabels: {
      [REGION_LABEL]: '!=""',
      envoy_response_code: '=~"[45].."',
      ...scope.customLabels,
    },
    filters: [createRegionFilter(scope.regions), createStatusClassFilter(scope.statusClasses)],
    groupBy: [REGION_LABEL],
  });
}

export function albWafIncreaseQuery(scope: AlbQueryScope, window: string): string {
  return `sum(${resetGuardedIncrease(CORAZA_EVENTS_METRIC, wafSelector(scope), window)})`;
}

export function albWafByOutcomeQuery(scope: AlbQueryScope, step: string): string {
  return (
    `sum by (coraza_outcome) (` +
    `sum_over_time(` +
    `${resetGuardedIncrease(CORAZA_EVENTS_METRIC, wafSelector(scope), '1m')}` +
    `[${step}:1m]))`
  );
}

export function albWafByLabelQuery(
  label: 'coraza_rule_severity' | 'http_method',
  scope: AlbQueryScope,
  step: string
): string {
  const series = `sum_over_time(${resetGuardedIncrease(CORAZA_EVENTS_METRIC, wafSelector(scope), '1m')}[${step}:1m])`;
  return (
    `sum by (${label}) (` + `label_replace(${series},"${label}","unknown","${label}","^$")` + `)`
  );
}

export function albWafTopRulesQuery(scope: AlbQueryScope, window: string, top = 20): string {
  return (
    `topk(${top}, sum by (` +
    `coraza_rule_id, coraza_rule_file, coraza_interruption_phase, ` +
    `coraza_rule_severity, coraza_rule_action, coraza_rule_version` +
    `) (` +
    `sum_over_time(` +
    `${resetGuardedIncrease(CORAZA_EVENTS_METRIC, wafSelector(scope), '1m')}` +
    `[${window}:1m]))` +
    `)`
  );
}
