import { BILLING_CYCLE_OPTIONS, PROJECT_FILTER_OPTIONS } from '../usage.mock';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@datum-cloud/datum-ui/select';
import { useState } from 'react';

/**
 * Filter row beneath the page title: a billing-cycle picker and a
 * project scope picker, with the current plan note pinned to the right.
 * The selects are presentational for the mock — they hold local state
 * but don't refetch anything yet.
 */
export function UsageToolbar() {
  const [billingCycle, setBillingCycle] = useState(BILLING_CYCLE_OPTIONS[0].value);
  const [projectFilter, setProjectFilter] = useState(PROJECT_FILTER_OPTIONS[0].value);

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <Select value={billingCycle} onValueChange={setBillingCycle}>
        <SelectTrigger className="h-9 w-full text-sm sm:w-[350px]">
          <SelectValue placeholder="Select billing cycle" />
        </SelectTrigger>
        <SelectContent>
          {BILLING_CYCLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={projectFilter} onValueChange={setProjectFilter}>
        <SelectTrigger className="h-9 w-full text-sm sm:w-[150px]">
          <SelectValue placeholder="Select project" />
        </SelectTrigger>
        <SelectContent>
          {PROJECT_FILTER_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
