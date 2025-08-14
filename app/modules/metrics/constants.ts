/**
 * Time-related constants for the Metrics module
 */

export const REFRESH_OPTIONS = [
  { label: 'Off', value: 'off' },
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
  { label: '15s', value: '15s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
] as const;

export type RefreshIntervalValue = (typeof REFRESH_OPTIONS)[number]['value'];

export const STEP_OPTIONS = [
  { label: '15s', value: '15s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '10m', value: '10m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
] as const;

export type StepValue = (typeof STEP_OPTIONS)[number]['value'];

export const PRESET_RANGES = [
  { label: 'Last 5m', value: 'now-5m' },
  { label: 'Last 15m', value: 'now-15m' },
  { label: 'Last 30m', value: 'now-30m' },
  { label: 'Last 1h', value: 'now-1h' },
  { label: 'Last 3h', value: 'now-3h' },
  { label: 'Last 6h', value: 'now-6h' },
  { label: 'Last 12h', value: 'now-12h' },
  { label: 'Last 24h', value: 'now-24h' },
  { label: 'Last 2d', value: 'now-2d' },
  { label: 'Last 7d', value: 'now-7d' },
] as const;

export type RangePresetValue = (typeof PRESET_RANGES)[number]['value'];
