import type { MeterDimensionBreakdown } from '@/modules/billing/usage.types';

export type MeterUnit = 'bytes' | 'count' | 'duration';

export interface MeterPoint {
  timestamp: number;
  value: number;
}

export interface UsageMeter {
  /** Amberflo meter uid — unique even when `apiName` (meterName) collides. */
  id: string;
  apiName: string;
  label: string;
  description: string;
  unit: MeterUnit;
  used: number;
  limit: number;
  /** Period spend estimated from catalog Offer rates × usage. */
  spend?: number;
  /** Unit rate from the active Offer, when available. */
  unitRate?: number;
  /** Billing pricing unit label from the Offer, e.g. `token`, `request`, `GB`. */
  pricingUnit?: string;
  /** ISO 4217 currency for spend/rate display. */
  currencyCode?: string;
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
  /** Amberflo meter uid — table row identity. */
  id: string;
  apiName: string;
  label: string;
  unit: MeterUnit;
  used: number;
  limit: number;
  spend?: number;
  unitRate?: number;
  /** Billing pricing unit label from the Offer, e.g. `token`, `request`, `GB`. */
  pricingUnit?: string;
  currencyCode?: string;
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
