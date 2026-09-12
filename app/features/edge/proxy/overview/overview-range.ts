import { useEffect, useMemo, useState } from 'react';

/**
 * Time windows offered by the overview's "Live metrics" control. Deliberately
 * short: the overview is a live view, the Metrics tab owns long ranges.
 */
export const OVERVIEW_RANGE_OPTIONS = [
  { value: '15m', label: 'Last 15 minutes', ms: 15 * 60 * 1000, step: '15s' },
  { value: '1h', label: 'Last 1 hour', ms: 60 * 60 * 1000, step: '1m' },
  { value: '6h', label: 'Last 6 hours', ms: 6 * 60 * 60 * 1000, step: '5m' },
  { value: '24h', label: 'Last 24 hours', ms: 24 * 60 * 60 * 1000, step: '15m' },
] as const;

export type OverviewRangeValue = (typeof OVERVIEW_RANGE_OPTIONS)[number]['value'];

export const DEFAULT_OVERVIEW_RANGE: OverviewRangeValue = '1h';

/** How often the window slides forward so 30s refetches see fresh data. */
const OVERVIEW_TICK_MS = 30_000;

export interface OverviewRange {
  value: OverviewRangeValue;
  label: string;
  /** Short label for inline use, e.g. "1h". */
  shortLabel: string;
  timeRange: { start: Date; end: Date };
  /** Prometheus step matching the window's density. */
  step: string;
}

/**
 * A sliding time window for the overview. `end` advances on a fixed tick so
 * every card keyed on the range refetches together rather than each card
 * computing its own `new Date()`.
 */
export function useOverviewRange(value: OverviewRangeValue): OverviewRange {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), OVERVIEW_TICK_MS);
    return () => window.clearInterval(timer);
  }, [value]);

  return useMemo(() => {
    const option =
      OVERVIEW_RANGE_OPTIONS.find((item) => item.value === value) ?? OVERVIEW_RANGE_OPTIONS[1];
    return {
      value: option.value,
      label: option.label,
      shortLabel: option.value,
      step: option.step,
      timeRange: { start: new Date(now - option.ms), end: new Date(now) },
    };
  }, [now, value]);
}
