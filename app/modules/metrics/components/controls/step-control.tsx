import { METRICS_CONTROL_HEIGHT_CLASS, STEP_OPTIONS } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { ButtonGroup, ButtonGroupText } from '@datum-cloud/datum-ui/button-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { cn } from '@datum-cloud/datum-ui/utils';
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
   * Defaults to `auto` (resolution follows the selected time range).
   */
  defaultValue?: string;
}

/**
 * Dropdown to select query step resolution for charts.
 * Supports URL state synchronization via filterKey prop.
 */
export const StepControl = ({ filterKey = 'step', defaultValue = 'auto' }: StepControlProps) => {
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

  // ButtonGroup joins the label and the select into one control; both use
  // datum-ui's field padding and type, so no size overrides beyond height.
  const currentStep = step || defaultValue;
  const stepLabel =
    STEP_OPTIONS.find((option) => option.value === currentStep)?.label ?? currentStep;

  return (
    <ButtonGroup className={cn('w-full sm:w-fit', METRICS_CONTROL_HEIGHT_CLASS)}>
      <ButtonGroupText>Step</ButtonGroupText>
      <Select value={step || defaultValue} onValueChange={setStep}>
        <SelectTrigger
          aria-label="Step"
          className={cn('bg-card flex-1 sm:w-auto sm:flex-initial', METRICS_CONTROL_HEIGHT_CLASS)}>
          {/* Explicit label so the server render shows it too; Radix fills SelectValue only on the client. */}
          <SelectValue placeholder="Select step">{stepLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {STEP_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </ButtonGroup>
  );
};
