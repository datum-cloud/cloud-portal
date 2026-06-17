export interface MeterSeries {
  meterApiName: string;
  label: string;
  description?: string;
  values: { timestamp: number; value: number }[];
}

export interface MeterDefinition {
  meterName: string;
  displayName: string;
  description?: string;
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
  days: number;
  message?: string;
}

export interface SummarizedMeterUsage {
  meterApiName: string;
  label: string;
  total: number;
  recentDaily: { date: string; value: number }[];
}
