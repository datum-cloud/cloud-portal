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
  updatedLabel: string;
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
}

export interface UsageProjectOption {
  name: string;
  displayName: string;
}

export interface UsageBillingCycleOption {
  value: 'current' | 'previous';
  label: string;
}
