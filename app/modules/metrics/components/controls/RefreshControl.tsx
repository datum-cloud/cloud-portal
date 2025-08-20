'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { REFRESH_OPTIONS } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context';
import { RefreshCw } from 'lucide-react';
import React from 'react';

/**
 * Dropdown to control automatic metrics refresh interval.
 */
export function RefreshControl(): React.ReactElement {
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
