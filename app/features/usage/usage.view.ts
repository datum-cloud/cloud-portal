/**
 * Adapter from the live `UsageFetchResult` (UsageQuery series enriched with
 * MeterDefinition metadata) into the view shapes the dashboard components
 * consume.
 */
import { aggregationQualifier, ucumToMeterUnit } from './usage.format';
import type {
  UsageDisplayNameOption,
  UsageGroupSection,
  UsageMeter,
  UsageProjectOption,
  UsageSummaryRow,
} from './usage.types';
import type { MeterSeries, UsageFetchResult, UsageSpend } from '@/modules/billing/usage.types';

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

function toUsageMeter(meter: MeterSeries, groupDisplayNames: GroupDisplayNames): UsageMeter {
  const unit = ucumToMeterUnit(meter.unit);
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
    id: meter.meterDefinition,
    apiName: meter.meterName ?? meter.meterDefinition,
    label: meter.label,
    description: meter.description ?? '',
    unit,
    used: meter.total,
    limit,
    qualifier: aggregationQualifier(meter.aggregation),
    spend: meter.spend,
    spendUnavailable: meter.spendUnavailable,
    tabs,
    series: meter.values,
    breakdowns,
  };
}

/** A meter recorded something in the period. */
function hasUsage(meter: UsageMeter): boolean {
  return meter.series.length > 0 || meter.used !== 0;
}

export interface UsageView {
  groups: UsageGroupSection[];
  summaryRows: UsageSummaryRow[];
  /** What all the usage costs together. */
  spend?: UsageSpend;
  /** Set when the total could not be priced. */
  spendUnavailable?: boolean;
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

  const meterByName = new Map(result.meters.map((m) => [m.meterDefinition, m]));

  const groups: UsageGroupSection[] = result.groups
    .map((group) => {
      const all = group.meterDefinitions
        .map((name) => meterByName.get(name))
        .filter((m): m is MeterSeries => Boolean(m))
        .map((meter) => toUsageMeter(meter, groupDisplayNames));
      return {
        id: group.id,
        title: group.title,
        description: `Metered consumption for ${group.title} in the selected billing period.`,
        meters: all.filter(hasUsage),
        idleMeters: all.filter((meter) => !hasUsage(meter)),
      };
    })
    .filter((group) => group.meters.length > 0 || group.idleMeters.length > 0);

  if (!groups.some((group) => group.meters.length > 0)) return null;

  const summaryRows: UsageSummaryRow[] = groups.flatMap((group) =>
    group.meters.map((meter) => {
      return {
        id: meter.id,
        apiName: meter.apiName,
        label: meter.label,
        unit: meter.unit,
        used: meter.used,
        limit: meter.limit,
        qualifier: meter.qualifier,
        spend: meter.spend,
        spendUnavailable: meter.spendUnavailable,
        series: meter.series,
        groupId: group.id,
        group: group.title,
      };
    })
  );

  return { groups, summaryRows, spend: result.spend, spendUnavailable: result.spendUnavailable };
}
