// app/modules/datum-ui/components/time-range-picker/index.ts

// Main component
export { TimeRangePicker, type TimeRangePickerProps } from './time-range-picker';

// Types
export type {
  TimeRangeValue,
  DateRange,
  PresetConfig,
  TimezoneOption,
  ApiTimeRange,
} from './types';

// Presets
export {
  DEFAULT_PRESETS,
  getPresetByKey,
  getPresetByShortcut,
  getDefaultPreset,
  getPresetRange,
} from './presets';

// Utilities
export {
  // Formatting
  formatTimeRangeDisplay,
  formatSingleTimeDisplay,
  formatDateForInput,
  // API
  toApiTimeRange,
  // Timezone
  getTimezoneOffset,
  formatTimezoneLabel,
  createTimezoneOption,
  getDefaultTimezoneOptions,
  getShortTimezoneDisplay,
  getBrowserTimezone,
  utcToLocalInputString,
  localInputStringToUtc,
  utcStringToZonedDate,
  zonedDateToUtcString,
  formatUtcForDisplay,
} from './utils';

// Sub-components (for advanced customization)
export { QuickRangesPanel } from './components/quick-ranges-panel';
export { CustomRangePanel, AbsoluteRangePanel } from './components/absolute-range-panel';
export { TimezoneSelector } from './components/timezone-selector';
