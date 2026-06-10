/**
 * Adapter from the live `UsageFetchResult` (Amberflo series enriched with
 * MeterDefinition metadata + AllowanceBucket quotas) into the view shapes
 * the dashboard components consume.
 */
import { ucumToMeterUnit } from './usage.format';
import type { UsageGroupSection, UsageMeter, UsageSummaryRow } from './usage.types';
import { OTHER_GROUP, resolveServiceDisplayName } from '@/features/quotas/service-catalog';
import type { MeterSeries, UsageFetchResult } from '@/modules/billing/usage.types';
import { formatDistanceToNowStrict } from 'date-fns';

function sumSeries(values: { value: number }[]): number {
  return values.reduce((acc, point) => acc + point.value, 0);
}

/** `projectId` → `Project`; `region` → `Region`; `model_name` → `Model Name`. */
export function humanizeDimension(dimension: string): string {
  return dimension
    .replace(/\.?id$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function updatedLabel(values: { timestamp: number }[]): string {
  if (values.length === 0) return '';
  const latest = values.reduce((max, point) => Math.max(max, point.timestamp), 0);
  if (!latest) return '';
  return `Updated ${formatDistanceToNowStrict(new Date(latest))} ago`;
}

function toUsageMeter(meter: MeterSeries): UsageMeter {
  const unit = ucumToMeterUnit(meter.unit);
  const used = meter.used ?? sumSeries(meter.values);
  const limit = meter.limit ?? 0;
  const breakdowns = (meter.breakdowns ?? []).filter((b) => b.series.length > 0);
  const tabs = ['Total', ...breakdowns.map((b) => humanizeDimension(b.dimension))];

  return {
    apiName: meter.meterApiName,
    label: meter.label,
    description: meter.description ?? '',
    unit,
    used,
    limit,
    tabs,
    series: meter.values,
    updatedLabel: updatedLabel(meter.values),
    breakdowns,
  };
}

export interface UsageView {
  groups: UsageGroupSection[];
  summaryRows: UsageSummaryRow[];
}

/** Build the dashboard view from live loader data. */
export function toUsageView(result: UsageFetchResult): UsageView | null {
  if (!result.groups?.length) return null;

  const meterByName = new Map(result.meters.map((m) => [m.meterApiName, m]));

  const groups: UsageGroupSection[] = result.groups
    .map((group) => {
      const meters = group.meterApiNames
        .map((name) => meterByName.get(name))
        .filter((m): m is MeterSeries => Boolean(m))
        .map(toUsageMeter);
      return {
        id: group.id,
        title: group.title,
        description: `Usage for the ${group.title} service across this organization, aggregated for the current period.`,
        meters,
      };
    })
    .filter((group) => group.meters.length > 0);

  if (groups.length === 0) return null;

  const summaryRows: UsageSummaryRow[] = groups.flatMap((group) =>
    group.meters.map((meter) => {
      const resolvedGroup = resolveServiceDisplayName(group.id, meter.apiName);
      return {
        apiName: meter.apiName,
        label: meter.label,
        unit: meter.unit,
        used: meter.used,
        limit: meter.limit,
        groupId: group.id,
        group: resolvedGroup === OTHER_GROUP ? group.title : resolvedGroup,
      };
    })
  );

  return { groups, summaryRows };
}
