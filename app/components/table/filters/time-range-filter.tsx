import { useDataTableFilters } from '@datum-cloud/datum-ui/data-table';
import {
  TimeRangePicker,
  type PresetConfig,
  type TimeRangeValue,
  DEFAULT_PRESETS,
  getBrowserTimezone,
  getPresetByKey,
  getPresetRange,
} from '@datum-cloud/datum-ui/date-picker';
import { useCallback, useMemo } from 'react';

export interface TimeRangeFilterProps {
  column: string;
  presets?: PresetConfig[];
  disableFuture?: boolean;
  className?: string;
  disabled?: boolean;
  timezone?: string;
}

export function TimeRangeFilter({
  column,
  presets = DEFAULT_PRESETS,
  disableFuture = true,
  className,
  disabled,
  timezone: timezoneProp,
}: TimeRangeFilterProps) {
  const { filters, setFilter, clearFilter } = useDataTableFilters();

  // Effective timezone: use provided value or fall back to browser timezone
  const timezone = useMemo(() => timezoneProp ?? getBrowserTimezone(), [timezoneProp]);

  const timeRange = (filters[column] as TimeRangeValue | undefined) ?? null;

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

  // Clear handler - resets to null (clears filter)
  const handleClear = useCallback(() => {
    clearFilter(column);
  }, [column, clearFilter]);

  // Change handler - sets the new value
  const handleChange = useCallback(
    (newValue: TimeRangeValue) => {
      setFilter(column, newValue);
    },
    [column, setFilter]
  );

  return (
    <TimeRangePicker
      value={effectiveTimeRange}
      onChange={handleChange}
      onClear={handleClear}
      timezone={timezone}
      presets={presets}
      disableFuture={disableFuture}
      className={className}
      disabled={disabled}
    />
  );
}
