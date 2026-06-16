/**
 * Adapter from the live `UsageFetchResult` (Amberflo series enriched with
 * MeterDefinition metadata + AllowanceBucket quotas) into the view shapes
 * the dashboard components consume.
 */
import { ucumToMeterUnit } from './usage.format';
import type {
  UsageGroupSection,
  UsageMeter,
  UsageProjectOption,
  UsageSummaryRow,
} from './usage.types';
import { OTHER_GROUP, resolveServiceDisplayName } from '@/features/quotas/service-catalog';
import type { MeterSeries, UsageFetchResult } from '@/modules/billing/usage.types';

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

const PROJECT_BREAKDOWN_DIMENSION = 'project_id';

function projectDisplayName(
  projectName: string,
  projects: UsageProjectOption[] | undefined
): string {
  return projects?.find((project) => project.name === projectName)?.displayName ?? projectName;
}

function toUsageMeter(meter: MeterSeries, projects?: UsageProjectOption[]): UsageMeter {
  const unit = ucumToMeterUnit(meter.unit);
  const used = meter.used ?? sumSeries(meter.values);
  const limit = meter.limit ?? 0;
  const breakdowns = (meter.breakdowns ?? [])
    .filter((b) => b.series.length > 0)
    .map((breakdown) =>
      breakdown.dimension === PROJECT_BREAKDOWN_DIMENSION
        ? {
            ...breakdown,
            series: breakdown.series.map((series) => ({
              ...series,
              groupValue: projectDisplayName(series.groupValue, projects),
            })),
          }
        : breakdown
    );
  const tabs = ['Total', ...breakdowns.map((b) => humanizeDimension(b.dimension))];

  return {
    apiName: meter.meterName ?? meter.meterApiName,
    label: meter.label,
    description: meter.description ?? '',
    unit,
    used,
    limit,
    tabs,
    series: meter.values,
    breakdowns,
  };
}

export interface UsageView {
  groups: UsageGroupSection[];
  summaryRows: UsageSummaryRow[];
}

/** Build the dashboard view from live loader data. */
export function toUsageView(
  result: UsageFetchResult,
  projects?: UsageProjectOption[]
): UsageView | null {
  if (!result.groups?.length) return null;

  const meterByName = new Map(result.meters.map((m) => [m.meterApiName, m]));

  const groups: UsageGroupSection[] = result.groups
    .map((group) => {
      const meters = group.meterApiNames
        .map((name) => meterByName.get(name))
        .filter((m): m is MeterSeries => Boolean(m))
        .map((meter) => toUsageMeter(meter, projects));
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
        series: meter.series,
        groupId: group.id,
        group: resolvedGroup === OTHER_GROUP ? group.title : resolvedGroup,
      };
    })
  );

  return { groups, summaryRows };
}
