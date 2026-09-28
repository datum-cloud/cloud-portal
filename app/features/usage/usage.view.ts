/**
 * Adapter from the live `UsageFetchResult` (Amberflo series enriched with
 * MeterDefinition metadata + AllowanceBucket quotas) into the view shapes
 * the dashboard components consume.
 */
import { ucumToMeterUnit } from './usage.format';
import type {
  UsageDisplayNameOption,
  UsageGroupSection,
  UsageMeter,
  UsageProjectOption,
  UsageSummaryRow,
} from './usage.types';
import type { MeterSeries, UsageFetchResult } from '@/modules/billing/usage.types';

function sumSeries(values: { value: number }[]): number {
  return values.reduce((acc, point) => acc + point.value, 0);
}

const DIMENSION_LABELS: Record<string, string> = {
  httproute_name: 'ALB',
};

/** `projectId` → `Project`; `region` → `Region`; `model_name` → `Model Name`. */
export function humanizeDimension(dimension: string): string {
  const label = DIMENSION_LABELS[dimension];
  if (label) return label;
  return dimension
    .replace(/\.?id$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

type GroupDisplayNames = Partial<Record<string, Map<string, string>>>;

function displayNameMap(options: UsageDisplayNameOption[] | undefined): Map<string, string> {
  return new Map(
    (options ?? [])
      .filter((option) => option.displayName)
      .map((option) => [option.name, option.displayName])
  );
}

function toUsageMeter(
  meter: MeterSeries,
  groupDisplayNames: GroupDisplayNames,
  currencyCode = 'USD'
): UsageMeter {
  const unit = ucumToMeterUnit(meter.unit);
  const used = meter.used ?? sumSeries(meter.values);
  const limit = meter.limit ?? 0;
  const breakdowns = (meter.breakdowns ?? [])
    .filter((b) => b.series.length > 0)
    .map((breakdown) => {
      const displayNames = groupDisplayNames[breakdown.dimension];
      if (!displayNames?.size) return breakdown;
      return {
        ...breakdown,
        series: breakdown.series.map((series) => ({
          ...series,
          groupValue: displayNames.get(series.groupValue) ?? series.groupValue,
        })),
      };
    });
  const tabs = ['Total', ...breakdowns.map((b) => humanizeDimension(b.dimension))];

  return {
    id: meter.meterApiName,
    apiName: meter.meterName ?? meter.meterApiName,
    label: meter.label,
    description: meter.description ?? '',
    unit,
    used,
    limit,
    spend: meter.spend,
    unitRate: meter.unitRate,
    pricingUnit: meter.pricingUnit,
    currencyCode,
    tabs,
    series: meter.values,
    breakdowns,
  };
}

export interface UsageView {
  groups: UsageGroupSection[];
  summaryRows: UsageSummaryRow[];
  totalSpend?: number;
  currencyCode?: string;
}

/** Build the dashboard view from live loader data. */
export function toUsageView(
  result: UsageFetchResult,
  projects?: UsageProjectOption[],
  albs?: UsageDisplayNameOption[]
): UsageView | null {
  if (!result.groups?.length) return null;

  const groupDisplayNames: GroupDisplayNames = {
    project_name: displayNameMap(projects),
    httproute_name: displayNameMap(albs),
  };

  const currencyCode = result.currencyCode ?? 'USD';
  const meterByName = new Map(result.meters.map((m) => [m.meterApiName, m]));

  const groups: UsageGroupSection[] = result.groups
    .map((group) => {
      const meters = group.meterApiNames
        .map((name) => meterByName.get(name))
        .filter((m): m is MeterSeries => Boolean(m))
        .map((meter) => toUsageMeter(meter, groupDisplayNames, currencyCode));
      return {
        id: group.id,
        title: group.title,
        description: `Metered consumption and spend for ${group.title} in the selected billing period.`,
        meters,
      };
    })
    .filter((group) => group.meters.length > 0);

  if (groups.length === 0) return null;

  const summaryRows: UsageSummaryRow[] = groups.flatMap((group) =>
    group.meters.map((meter) => {
      return {
        id: meter.id,
        apiName: meter.apiName,
        label: meter.label,
        unit: meter.unit,
        used: meter.used,
        limit: meter.limit,
        spend: meter.spend,
        unitRate: meter.unitRate,
        pricingUnit: meter.pricingUnit,
        currencyCode: meter.currencyCode,
        series: meter.series,
        groupId: group.id,
        group: group.title,
      };
    })
  );

  return {
    groups,
    summaryRows,
    totalSpend: result.totalSpend,
    currencyCode,
  };
}
