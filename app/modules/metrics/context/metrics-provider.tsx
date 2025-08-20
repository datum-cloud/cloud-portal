'use client';

import type { TimeRange } from '../../prometheus';
import { MetricsContext } from './use-metrics';
import { parseISO } from 'date-fns';
import { useQueryState, parseAsString } from 'nuqs';
import React from 'react';

// Helper to parse the 'range' parameter, which can be relative or absolute.

const parseDurationToMs = (durationStr: string): number | null => {
  const match = durationStr.match(/^(\d+)([smhdw])$/);
  if (!match) {
    return null;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'w':
      return value * 7 * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
};

// Helper to parse the 'range' parameter, which can be relative or absolute.
const parseRange = (rangeStr: string): TimeRange => {
  // Check for custom range format: 'iso_iso'
  if (rangeStr.includes('_')) {
    const [startStr, endStr] = rangeStr.split('_');
    const start = parseISO(startStr);
    const end = parseISO(endStr);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      return { start, end };
    }
  }

  // Check for relative time format: 'now-1h'
  if (rangeStr.startsWith('now-')) {
    const durationStr = rangeStr.substring(4);
    const durationMs = parseDurationToMs(durationStr);
    if (durationMs) {
      const end = new Date();
      const start = new Date(end.getTime() - durationMs);
      return { start, end };
    }
  }

  // Default fallback (e.g., last 6 hours)
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 60 * 60 * 1000);
  return { start, end };
};

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useQueryState('range', parseAsString.withDefault('now-6h'));
  const [step, setStep] = useQueryState('step', parseAsString.withDefault('1m'));
  const [refreshInterval, setRefreshInterval] = useQueryState(
    'refresh',
    parseAsString.withDefault('off')
  );

  const [lastRefreshed, setLastRefreshed] = React.useState<Date | null>(null);

  const refetch = React.useCallback(() => {
    setLastRefreshed(new Date());
  }, []);

  const timeRange: TimeRange = React.useMemo(() => parseRange(range), [range]);

  React.useEffect(() => {
    // Initial fetch when component mounts or settings change
    refetch();
  }, [range, step, refetch]);

  React.useEffect(() => {
    if (refreshInterval === 'off') return;

    const intervalMs = parseDurationToMs(refreshInterval);
    if (!intervalMs) {
      return;
    }

    const intervalId = setInterval(refetch, intervalMs);

    return () => clearInterval(intervalId);
  }, [refreshInterval, refetch]);

  const value = {
    range,
    setRange,
    timeRange,
    step,
    setStep,
    refreshInterval,
    setRefreshInterval,
    lastRefreshed,
    refetch,
  };

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}
