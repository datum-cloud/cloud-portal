import type { MeterDimensionBreakdown, UsageSpend } from '@/modules/billing/usage.types';

/**
 * Display family for a meter's UCUM unit. `scale` converts a raw value into
 * the family's base unit: bytes, seconds, byte-seconds or core-seconds.
 */
export interface MeterUnit {
  kind: 'count' | 'bytes' | 'duration' | 'byteTime' | 'cpuTime';
  scale: number;
}

export interface MeterPoint {
  timestamp: number;
  value: number;
}

export interface UsageMeter {
  /** MeterDefinition name — unique even when `apiName` (meterName) collides. */
  id: string;
  apiName: string;
  label: string;
  description: string;
  unit: MeterUnit;
  used: number;
  limit: number;
  /**
   * How `used` reads when it is not a running total, e.g. `latest` for a
   * gauge like allocated CPU. Unset for Sum and Count meters.
   */
  qualifier?: string;
  /** What the usage costs, from `UsageQuery`; unset when no plan prices it. */
  spend?: UsageSpend;
  /** Why `spend` could not be computed. */
  spendError?: string;
  /** Breakdown tabs shown above the chart. The first entry is the default. */
  tabs: string[];
  series: MeterPoint[];
  breakdowns?: MeterDimensionBreakdown[];
}

export interface UsageGroupSection {
  id: string;
  title: string;
  description: string;
  /** Meters with usage in the period. */
  meters: UsageMeter[];
  /** The group's meters with no usage in the period. */
  idleMeters: UsageMeter[];
}

export interface UsageSummaryRow {
  /** MeterDefinition name — table row identity. */
  id: string;
  apiName: string;
  label: string;
  unit: MeterUnit;
  used: number;
  limit: number;
  qualifier?: string;
  spend?: UsageSpend;
  spendError?: string;
  /** Daily aggregate series for inline spark charts. */
  series: MeterPoint[];
  /** Human-readable service group, e.g. `Compute`, `AI Assistant`. */
  group: string;
  /** Owning service domain from the meter catalog, e.g. `assistant.miloapis.com`. */
  groupId: string;
}

export interface UsageDisplayNameOption {
  name: string;
  displayName: string;
}

export type UsageProjectOption = UsageDisplayNameOption;

export interface UsageBillingCycleOption {
  value: 'current' | 'previous';
  label: string;
}
