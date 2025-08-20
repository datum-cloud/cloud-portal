'use client';

import type { TimeRange } from '../../prometheus';
import { MetricsContext } from './use-metrics';
import { parseRange } from '@/modules/metrics/utils';
import { useQueryState, parseAsString } from 'nuqs';
import React from 'react';

export function MetricsProvider({ children }: { children: React.ReactNode }) {
  const [range, setRange] = useQueryState('range', parseAsString.withDefault('now-6h'));
  const [step, setStep] = useQueryState('step', parseAsString.withDefault('1m'));
  const [refreshInterval, setRefreshInterval] = useQueryState(
    'refresh',
    parseAsString.withDefault('off')
  );

  const timeRange: TimeRange = React.useMemo(() => parseRange(range), [range]);

  const value = {
    range,
    setRange: (v: string) => {
      void setRange(v);
    },
    timeRange,
    step,
    setStep: (v: string) => {
      void setStep(v);
    },
    refreshInterval,
    setRefreshInterval: (v: string) => {
      void setRefreshInterval(v);
    },
  };

  return <MetricsContext.Provider value={value}>{children}</MetricsContext.Provider>;
}
