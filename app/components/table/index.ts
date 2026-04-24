// Components
export { Table } from './table';
export { createActionsColumn, columnHeader } from './columns';
export type { ActionsColumnOptions, ColumnHeaderOptions } from './columns';
export { TagFilter } from './filters/tag-filter';
export { TimeRangeFilter } from './filters/time-range-filter';

// Types — props and configs
export type {
  EmptyContentConfig,
  InlineContentConfig,
  MultiAction,
  RowAction,
  ServerFetchArgs,
  ServerTransformResult,
  TableClientProps,
  TableServerProps,
  TableServerRef,
} from './types';

// Hooks — pass-through from datum-ui for consumer-side context reads.
// Useful for building custom action components (e.g. a refresh button that
// reads loading state) that render inside Table.Server's `actions` slot.
export { useDataTableLoading } from '@datum-cloud/datum-ui/data-table';

// Types — row actions (pass-through from datum-ui, unchanged)
export type { ActionItem } from '@datum-cloud/datum-ui/data-table';

// Types — filter props
export type { TagFilterOption, TagFilterProps } from './filters/tag-filter';
export type { TimeRangeFilterProps } from './filters/time-range-filter';
