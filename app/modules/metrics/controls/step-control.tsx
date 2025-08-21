'use client';

import { useMetricsControl } from '../panel/hooks';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { STEP_OPTIONS } from '@/modules/metrics/constants';
import React from 'react';

/**
 * Step control for selecting query resolution
 */
export function StepControl(): React.ReactElement {
  const { value: step, setValue: setStep } = useMetricsControl<string>('step');

  const currentStep = step || '1m';

  return (
    <Select value={currentStep} onValueChange={setStep}>
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
