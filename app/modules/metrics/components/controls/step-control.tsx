import { STEP_OPTIONS } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { Button } from '@datum-ui/components';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/ui/select';
import { useQueryState } from 'nuqs';
import { useEffect } from 'react';

export interface StepControlProps {
  /**
   * URL parameter key for this step control.
   * Defaults to 'step' for backward compatibility.
   */
  filterKey?: string;
  /**
   * Default step value when no URL state exists.
   * Defaults to '15m'.
   */
  defaultValue?: string;
}

/**
 * Dropdown to select query step resolution for charts.
 * Supports URL state synchronization via filterKey prop.
 */
export const StepControl = ({ filterKey = 'step', defaultValue = '15m' }: StepControlProps) => {
  const { registerUrlState, updateUrlStateEntry } = useMetrics();

  // Register URL state for this control
  useEffect(() => {
    registerUrlState(filterKey, 'string', defaultValue);
  }, [registerUrlState, filterKey, defaultValue]);

  // Create URL state hook
  const [step, setStep] = useQueryState(filterKey, createMetricsParser('string', defaultValue));

  // Update registry with actual URL state hooks (only when value changes)
  useEffect(() => {
    updateUrlStateEntry(filterKey, step, setStep);
  }, [updateUrlStateEntry, filterKey, step]);

  return (
    <div className="border-input bg-background flex h-[36px] items-center rounded-md border">
      <Button
        type="quaternary"
        theme="borderless"
        size="small"
        className="pointer-events-none w-auto cursor-default rounded-r-none border-r font-medium">
        Step
      </Button>
      <Select value={step || defaultValue} onValueChange={setStep}>
        <SelectTrigger className="min-w-10 rounded-l-none border-0 px-2 focus:ring-0">
          <SelectValue placeholder="Select step" />
        </SelectTrigger>
        <SelectContent>
          {STEP_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
