/**
 * Adapter from the live `UsageFetchResult` (Amberflo series enriched with
 * MeterDefinition metadata + AllowanceBucket quotas) into the view shapes
 * the dashboard components already consume (`MockGroup` / `MockMeter` /
 * `UsageSummaryRow`). Keeping the mapping here lets the presentational
 * components stay agnostic about where their data comes from, so the mock
 * dataset remains a drop-in fallback when the org has no live usage yet.
 */
import { ucumToMeterUnit } from './usage.format';
import type { MockGroup, MockMeter, UsageSummaryRow } from './usage.mock';
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

function toMockMeter(meter: MeterSeries): MockMeter {
  const unit = ucumToMeterUnit(meter.unit);
  const used = meter.used ?? sumSeries(meter.values);
  const limit = meter.limit ?? 0;
  // Only surface a breakdown tab when the dimension actually returned data;
  // a declared-but-empty dimension would just re-render the aggregate.
  const breakdowns = (meter.breakdowns ?? []).filter((b) => b.series.length > 0);
  const tabs = ['Total', ...breakdowns.map((b) => humanizeDimension(b.dimension))];

  return {
    apiName: meter.meterApiName,
    label: meter.label,
    description: meter.description ?? '',
    learnMoreHref: '',
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
  groups: MockGroup[];
  summaryRows: UsageSummaryRow[];
}

/**
 * Build the dashboard view from live data, or return `null` when there's
 * nothing real to show (no groups, or every meter is empty) so the caller
 * can fall back to the mock dataset.
 */
export function toUsageView(result: UsageFetchResult): UsageView | null {
  if (!result.groups?.length) return null;

  const meterByName = new Map(result.meters.map((m) => [m.meterApiName, m]));

  const groups: MockGroup[] = result.groups
    .map((group) => {
      const meters = group.meterApiNames
        .map((name) => meterByName.get(name))
        .filter((m): m is MeterSeries => Boolean(m))
        .map(toMockMeter);
      return {
        id: group.id,
        title: group.title,
        description: `Usage for the ${group.title} service across this organization, aggregated for the current period.`,
        meters,
      };
    })
    .filter((group) => group.meters.length > 0);

  const hasAnyData = groups.some((group) =>
    group.meters.some((meter) => meter.series.length > 0 || meter.used > 0)
  );
  if (!hasAnyData) return null;

  const summaryRows: UsageSummaryRow[] = groups.flatMap((group) =>
    group.meters.map((meter) => ({
      apiName: meter.apiName,
      label: meter.label,
      unit: meter.unit,
      used: meter.used,
      limit: meter.limit,
    }))
  );

  return { groups, summaryRows };
}
