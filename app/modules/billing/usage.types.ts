export interface MeterPoint {
  timestamp: number;
  value: number;
}

/** One grouped series within a dimension breakdown (e.g. region=us-east-1). */
export interface MeterBreakdownSeries {
  /** The dimension value this series belongs to (e.g. `us-east-1`, `claude`). */
  groupValue: string;
  /** Usage over the whole range, using the meter's aggregation. */
  total: number;
  values: MeterPoint[];
}

/** All grouped series for a single dimension of a meter. */
export interface MeterDimensionBreakdown {
  dimension: string;
  series: MeterBreakdownSeries[];
}

export interface MeterSeries {
  /** `MeterDefinition.metadata.name`. */
  meterDefinition: string;
  /** Canonical meter name from `MeterDefinition.spec.meterName`. */
  meterName?: string;
  label: string;
  /** Daily buckets across the queried range, zero-filled; empty when no usage. */
  values: MeterPoint[];
  /**
   * Usage over the whole range from `UsageQuery`, using the meter's
   * aggregation (correct for Max, Latest, Average… not just Sum).
   */
  total: number;
  // ---- Enrichment from the MeterDefinition catalog. ----
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
  /** Per-dimension grouped series, when the meter declares dimensions. */
  breakdowns?: MeterDimensionBreakdown[];
  /** What the usage costs, from `UsageQuery`; unset when no plan prices it. */
  spend?: UsageSpend;
  /** Set when the API could not price the meter; the reason is logged server-side. */
  spendUnavailable?: boolean;
}

/** An amount in an ISO 4217 currency, before taxes, credits and discounts. */
export interface UsageSpend {
  amount: number;
  currency: string;
}

export interface MeterDefinition {
  /** `MeterDefinition.metadata.name`, how `UsageQuery` references meters. */
  name: string;
  /** Canonical meter name from `MeterDefinition.spec.meterName`. */
  meterName: string;
  displayName: string;
  description?: string;
  unit?: string;
  aggregation?: string;
  dimensions?: string[];
  /** Dimensions the billing pipeline adds, e.g. `project_name`. */
  systemDimensions?: string[];
  monitoredResourceTypes?: string[];
}

/** A service-scoped grouping of meters surfaced in the usage dashboard. */
export interface UsageGroup {
  id: string;
  title: string;
  meterDefinitions: string[];
}

export type UsageFetchStatus = 'ok' | 'insufficient-permissions' | 'no-billing-account';

export interface UsageFetchResult {
  status: UsageFetchStatus;
  meters: MeterSeries[];
  /** Meters bucketed by owning service, in display order. Optional for
   * back-compat with callers that only read the flat `meters` list. */
  groups?: UsageGroup[];
  days: number;
  message?: string;
  /** When set, usage is scoped to a single project. */
  projectId?: string;
  /** What all the usage costs together, from `UsageQuery`. */
  spend?: UsageSpend;
  /** Set when the total could not be priced; the reason is logged server-side. */
  spendUnavailable?: boolean;
}

export interface SummarizedMeterUsage {
  meterDefinition: string;
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
  /**
   * The billing account lookup failed upstream (not a missing account), so
   * `billingCycles` are the defaults rather than the account's payment terms.
   */
  billingAccountError: boolean;
}
