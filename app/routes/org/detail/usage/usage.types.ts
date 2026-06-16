import type { MeterDimensionBreakdown } from '@/modules/billing/usage.types';

export type MeterUnit = 'bytes' | 'count' | 'duration';

export interface MeterPoint {
  timestamp: number;
  value: number;
}

export interface UsageMeter {
  apiName: string;
  label: string;
  description: string;
  unit: MeterUnit;
  used: number;
  limit: number;
  /** Breakdown tabs shown above the chart. The first entry is the default. */
  tabs: string[];
  series: MeterPoint[];
  breakdowns?: MeterDimensionBreakdown[];
}

export interface UsageGroupSection {
  id: string;
  title: string;
  description: string;
  meters: UsageMeter[];
}

export interface UsageSummaryRow {
  apiName: string;
  label: string;
  unit: MeterUnit;
  used: number;
  limit: number;
  /** Daily aggregate series for inline spark charts. */
  series: MeterPoint[];
  /** Human-readable service group, e.g. `Compute`, `AI Assistant`. */
  group: string;
  /** Owning service domain from the meter catalog, e.g. `assistant.miloapis.com`. */
  groupId: string;
}

export interface UsageProjectOption {
  name: string;
  displayName: string;
}

export interface UsageBillingCycleOption {
  value: 'current' | 'previous';
  label: string;
}
