// app/modules/datum-ui/components/data-table/utils/time-range-serialization.ts
import type { TimeRangeValue } from '../../time-range-picker';

/**
 * Serialize TimeRangeValue for URL
 *
 * Format:
 *   - Preset: "p:1h" (just the preset key - timestamps recalculated on deserialize)
 *   - Custom: "c:1767930600000_1768571400000" (millisecond timestamps)
 */
export function serializeTimeRange(value: TimeRangeValue | null): string {
  if (!value || !value.from || !value.to) return '';

  // For presets, just store the key - timestamps will be recalculated
  // This keeps URLs short and ensures "Last hour" always means "last hour from now"
  if (value.type === 'preset' && value.preset) {
    return `p:${value.preset}`;
  }

  // For custom ranges, store millisecond timestamps (shorter, no encoding needed)
  if (value.type === 'custom') {
    const fromMs = new Date(value.from).getTime();
    const toMs = new Date(value.to).getTime();
    return `c:${fromMs}_${toMs}`;
  }

  return '';
}

/**
 * Deserialize URL string to TimeRangeValue
 * Note: For presets, only the key is returned - caller must calculate timestamps
 */
export function deserializeTimeRange(value: string): TimeRangeValue | null {
  if (!value) return null;

  // Preset format: "p:1h"
  if (value.startsWith('p:')) {
    const preset = value.slice(2);
    return {
      type: 'preset',
      preset,
      from: '', // Will be calculated by the component
      to: '',
    };
  }

  // Custom format: "c:1767930600000_1768571400000" (millisecond timestamps)
  if (value.startsWith('c:')) {
    const content = value.slice(2);
    const separatorIndex = content.indexOf('_');
    if (separatorIndex > 0) {
      const fromMs = parseInt(content.slice(0, separatorIndex), 10);
      const toMs = parseInt(content.slice(separatorIndex + 1), 10);

      // Validate parsed values
      if (!isNaN(fromMs) && !isNaN(toMs)) {
        return {
          type: 'custom',
          from: new Date(fromMs).toISOString(),
          to: new Date(toMs).toISOString(),
        };
      }
    }
  }

  return null;
}
