// app/modules/datum-ui/components/data-table/features/filter/components/time-range.tsx
import { useTimeRangeFilter } from '../../../hooks/useFilterQueryState';
import {
  TimeRangePicker,
  type PresetConfig,
  type TimeRangeValue,
  DEFAULT_PRESETS,
  getBrowserTimezone,
  getPresetByKey,
  getPresetRange,
} from '@datum-ui/components/time-range-picker';
import { useMemo, useCallback } from 'react';

export interface TimeRangeFilterProps {
  /** Filter key for time range state & URL */
  filterKey: string;

  /** Preset configurations */
  presets?: PresetConfig[];

  /** Disable future dates */
  disableFuture?: boolean;

  /** Custom class name */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Timezone for time range calculations (defaults to browser timezone) */
  timezone?: string;
}

export function TimeRangeFilter({
  filterKey,
  presets = DEFAULT_PRESETS,
  disableFuture = true,
  className,
  disabled,
  timezone: timezoneProp,
}: TimeRangeFilterProps) {
  // Effective timezone: use provided value or fall back to browser timezone
  const timezone = useMemo(() => timezoneProp ?? getBrowserTimezone(), [timezoneProp]);

  // Sync time range with DataTable filter state + URL
  const { value: timeRange, setValue: setTimeRange } = useTimeRangeFilter(filterKey, null);

  // Compute effective value for display (handles missing timestamps)
  const effectiveTimeRange = useMemo<TimeRangeValue | null>(() => {
    if (!timeRange) return null;

    // If preset without timestamps, calculate them for display
    if (timeRange.type === 'preset' && timeRange.preset && (!timeRange.from || !timeRange.to)) {
      const preset = getPresetByKey(timeRange.preset, presets);
      if (preset) {
        const range = getPresetRange(preset, timezone);
        return {
          type: 'preset',
          preset: preset.key,
          from: range.from,
          to: range.to,
        };
      }
    }

    return timeRange;
  }, [timeRange, presets, timezone]);

  // Clear handler - resets to null (clears URL params, uses default)
  const handleClear = useCallback(() => {
    setTimeRange(null as unknown as TimeRangeValue); // Clear the value
  }, [setTimeRange]);

  return (
    <TimeRangePicker
      value={effectiveTimeRange}
      onChange={setTimeRange}
      onClear={handleClear}
      timezone={timezone}
      presets={presets}
      disableFuture={disableFuture}
      className={className}
      disabled={disabled}
    />
  );
}
