import { PRESET_RANGES } from '@/modules/metrics/constants';
import { useMetrics } from '@/modules/metrics/context/metrics.context';
import {
  getPresetDateRange,
  parseRange,
  serializeTimeRange,
} from '@/modules/metrics/utils/date-parsers';
import { createMetricsParser } from '@/modules/metrics/utils/url-parsers';
import { useApp } from '@/providers/app.provider';
import type { PresetConfig, TimeRangeValue } from '@datum-cloud/datum-ui/date-picker';
import { TimeRangePicker, getBrowserTimezone } from '@datum-cloud/datum-ui/date-picker';
import { useQueryState } from 'nuqs';
import { useCallback, useEffect, useMemo } from 'react';

/** Metrics presets as PresetConfig for the datum-ui TimeRangePicker */
const METRICS_PRESETS: PresetConfig[] = PRESET_RANGES.map((p, i) => ({
  key: p.value,
  label: p.label,
  shortcut: p.value === 'now-7d' ? 'w' : p.value === 'now-24h' ? 'd' : String(i + 1),
  getRange: (timezone: string) => getPresetDateRange(p.value, timezone),
}));

function urlValueToTimeRangeValue(
  urlValue: string | null,
  timezone: string,
  defaultValue: string
): TimeRangeValue | null {
  const raw = urlValue ?? defaultValue;
  if (!raw) return null;

  const presetValues: string[] = PRESET_RANGES.map((r) => r.value);
  if (presetValues.includes(raw)) {
    const range = getPresetDateRange(raw, timezone);
    return {
      type: 'preset',
      preset: raw,
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    };
  }

  const { start, end } = parseRange(raw);
  return {
    type: 'custom',
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

function timeRangeValueToUrlValue(value: TimeRangeValue): string {
  if (value.type === 'preset' && value.preset) {
    return value.preset;
  }
  return serializeTimeRange({
    start: new Date(value.from),
    end: new Date(value.to),
  });
}

export interface TimeRangeControlProps {
  /**
   * URL parameter key for this time range control.
   * Defaults to 'timeRange' for backward compatibility.
   */
  filterKey?: string;
  /**
   * Default time range value when no URL state exists.
   * Defaults to 'now-24h'.
   */
  defaultValue?: string;
}

/**
 * Control to pick a time range using relative presets or absolute dates.
 * Uses the datum-ui TimeRangePicker and supports URL state via filterKey.
 */
export const TimeRangeControl = ({
  filterKey = 'timeRange',
  defaultValue = 'now-24h',
}: TimeRangeControlProps) => {
  const { registerUrlState, updateUrlStateEntry } = useMetrics();
  const { userPreferences } = useApp();

  const timezone = useMemo(
    () => userPreferences?.timezone ?? getBrowserTimezone(),
    [userPreferences]
  );

  useEffect(() => {
    registerUrlState(filterKey, 'string', defaultValue);
  }, [registerUrlState, filterKey, defaultValue]);

  const [urlValue, setUrlValue] = useQueryState(
    filterKey,
    createMetricsParser('string', defaultValue)
  );

  useEffect(() => {
    updateUrlStateEntry(filterKey, urlValue, setUrlValue);
  }, [updateUrlStateEntry, filterKey, urlValue]);

  const value = useMemo(
    () => urlValueToTimeRangeValue(urlValue, timezone, defaultValue),
    [urlValue, timezone, defaultValue]
  );

  const handleChange = useCallback(
    (newValue: TimeRangeValue) => {
      setUrlValue(timeRangeValueToUrlValue(newValue));
    },
    [setUrlValue]
  );

  const handleClear = useCallback(() => {
    setUrlValue(defaultValue);
  }, [setUrlValue, defaultValue]);

  return (
    <TimeRangePicker
      value={value}
      onChange={handleChange}
      onClear={handleClear}
      timezone={timezone}
      presets={METRICS_PRESETS}
      disableFuture
      placeholder="Select time range"
      align="start"
      className="w-full sm:w-auto"
    />
  );
};
