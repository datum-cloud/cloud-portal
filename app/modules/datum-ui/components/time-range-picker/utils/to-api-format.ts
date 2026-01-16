// app/modules/datum-ui/components/time-range-picker/utils/to-api-format.ts
import { DEFAULT_PRESETS, getPresetRange } from '../presets';
import type { TimeRangeValue, ApiTimeRange, PresetConfig } from '../types';
import { getBrowserTimezone } from './timezone';

/**
 * Convert a TimeRangeValue to API format (startTime/endTime)
 *
 * Since TimeRangeValue now always stores UTC timestamps,
 * this is a simple passthrough.
 *
 * @param value - The time range value (stores UTC timestamps)
 * @param timezone - User's timezone (used only if value needs recalculation)
 * @param presets - Preset configurations
 */
export function toApiTimeRange(
  value: TimeRangeValue | null,
  timezone?: string,
  presets: PresetConfig[] = DEFAULT_PRESETS
): ApiTimeRange {
  const tz = timezone ?? getBrowserTimezone();

  // Default fallback - use first preset
  if (!value) {
    const defaultPreset = presets[0];
    const range = getPresetRange(defaultPreset, tz);
    return { startTime: range.from, endTime: range.to };
  }

  // Value has from/to - use them directly (they're already UTC)
  if (value.from && value.to) {
    return {
      startTime: value.from,
      endTime: value.to,
    };
  }

  // Fallback for malformed value - recalculate from preset
  if (value.type === 'preset' && value.preset) {
    const preset = presets.find((p) => p.key === value.preset);
    if (preset) {
      const range = getPresetRange(preset, tz);
      return { startTime: range.from, endTime: range.to };
    }
  }

  // Ultimate fallback
  const defaultPreset = presets[0];
  const range = getPresetRange(defaultPreset, tz);
  return { startTime: range.from, endTime: range.to };
}
