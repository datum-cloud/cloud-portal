'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STEP_OPTIONS } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context';
import React from 'react';

/**
 * Dropdown to select query step resolution for charts.
 */
export function StepControl(): React.ReactElement {
  const { step, setStep } = useMetrics();
  return (
    <Select value={step} onValueChange={setStep}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select step" />
      </SelectTrigger>
      <SelectContent>
        {STEP_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            Step: {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
