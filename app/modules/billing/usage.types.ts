export interface MeterPoint {
  timestamp: number;
  value: number;
}

/** One grouped series within a dimension breakdown (e.g. region=us-east-1). */
export interface MeterBreakdownSeries {
  /** The dimension value this series belongs to (e.g. `us-east-1`, `claude`). */
  groupValue: string;
  values: MeterPoint[];
}

/** All grouped series for a single dimension of a meter. */
export interface MeterDimensionBreakdown {
  dimension: string;
  series: MeterBreakdownSeries[];
}

export interface MeterSeries {
  /** Amberflo meter id (`MeterDefinition.metadata.uid`). */
  meterApiName: string;
  /** Canonical meter name from `MeterDefinition.spec.meterName`. */
  meterName?: string;
  label: string;
  values: MeterPoint[];
  // ---- Enrichment from the MeterDefinition catalog (optional; absent
  // when the meter-definition list is unavailable). ----
  /** Plain-English explanation from `MeterDefinition.spec.description`. */
  description?: string;
  /** UCUM unit from `MeterDefinition.spec.measurement.unit` (e.g. `By`, `s`). */
  unit?: string;
  /** Rollup function from `MeterDefinition.spec.measurement.aggregation`. */
  aggregation?: string;
  /** Group-by keys from `MeterDefinition.spec.measurement.dimensions`. */
  dimensions?: string[];
  /** Owning service group id, e.g. `compute.miloapis.com`. */
  groupId?: string;
  /** Human-readable group title, e.g. `Compute`. */
  groupTitle?: string;
  // ---- Quota join (optional; from quota.miloapis.com AllowanceBuckets). ----
  /** Quota ceiling for the period, when a matching AllowanceBucket exists. */
  limit?: number;
  /** Allocated/consumed amount from the matching AllowanceBucket. */
  used?: number;
  /** Per-dimension grouped series, fetched when the meter declares dimensions. */
  breakdowns?: MeterDimensionBreakdown[];
}

export interface MeterDefinition {
  /** Amberflo meter id (`MeterDefinition.metadata.uid`). */
  meterApiName: string;
  /** Canonical meter name from `MeterDefinition.spec.meterName`. */
  meterName: string;
  displayName: string;
  description?: string;
  unit?: string;
  aggregation?: string;
  dimensions?: string[];
  monitoredResourceTypes?: string[];
}

/** A service-scoped grouping of meters surfaced in the usage dashboard. */
export interface UsageGroup {
  id: string;
  title: string;
  meterApiNames: string[];
}

export type UsageFetchStatus =
  | 'ok'
  | 'unconfigured'
  | 'insufficient-permissions'
  | 'no-billing-account'
  | 'feature-disabled';

export interface UsageFetchResult {
  status: UsageFetchStatus;
  meters: MeterSeries[];
  /** Meters bucketed by owning service, in display order. Optional for
   * back-compat with callers that only read the flat `meters` list. */
  groups?: UsageGroup[];
  days: number;
  message?: string;
  /** When set, usage is scoped to a single project's billing binding. */
  projectId?: string;
}

export interface SummarizedMeterUsage {
  meterApiName: string;
  label: string;
  total: number;
  recentDaily: { date: string; value: number }[];
}

export interface UsageBillingCycleOption {
  value: 'current' | 'previous';
  label: string;
}

/** Payload returned by `GET /api/usage` and `loadOrgUsageDashboard`. */
export interface OrgUsageDashboardData {
  usage: UsageFetchResult;
  selectedProject: string;
  billingCycles: UsageBillingCycleOption[];
  selectedBillingCycle: 'current' | 'previous';
}
