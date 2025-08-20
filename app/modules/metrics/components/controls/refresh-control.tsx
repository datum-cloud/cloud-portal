'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMetrics } from '@/modules/metrics/context';
import { RefreshCw } from 'lucide-react';
import React from 'react';

const REFRESH_OPTIONS = [
  { label: 'Off', value: 'off' },
  { label: '5s', value: '5s' },
  { label: '10s', value: '10s' },
  { label: '15s', value: '15s' },
  { label: '30s', value: '30s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
];

export function RefreshControl() {
  const { refreshInterval, setRefreshInterval } = useMetrics();
  const isRefreshing = refreshInterval !== 'off';

  return (
    <Select value={refreshInterval} onValueChange={setRefreshInterval}>
      <SelectTrigger className="w-[180px]">
        <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        <SelectValue placeholder="Select refresh interval" />
      </SelectTrigger>
      <SelectContent>
        {REFRESH_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
