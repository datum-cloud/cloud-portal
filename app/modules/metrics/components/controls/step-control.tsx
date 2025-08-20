'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useMetrics } from '@/modules/metrics/context';
import React from 'react';

const STEP_OPTIONS = [
  { label: '15s', value: '15s' },
  { label: '1m', value: '1m' },
  { label: '5m', value: '5m' },
  { label: '10m', value: '10m' },
  { label: '15m', value: '15m' },
  { label: '30m', value: '30m' },
  { label: '1h', value: '1h' },
];

export function StepControl() {
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
