// Main component and types
export { DataTableFilter } from './data-table-filter';
export type { DataTableFilterProps } from './data-table-filter';

// Individual components for advanced usage
export {
  SearchFilter,
  DatePickerFilter,
  SelectFilter,
  RadioFilter,
  CheckboxFilter,
} from './data-table-filter';

// Component-specific types
export type { SearchFilterProps } from './components/search';
export type { DatePickerFilterProps } from './components/datepicker';
export type { SelectFilterProps, SelectOption } from './components/select';
export type { RadioFilterProps, RadioOption } from './components/radio';
export type { CheckboxFilterProps, CheckboxOption } from './components/checkbox';

// Context and hooks (from unified context)
export {
  useDataTableFilter,
  useFilter,
  useDataTable,
  useTableData,
  useFilterData,
  useTableState,
} from '../data-table.context';

// URL-aware filter hooks
export {
  useFilterQueryState,
  useStringFilter,
  useArrayFilter,
  useDateFilter,
  useDateRangeFilter,
} from '../hooks/useFilterQueryState';

export type { FilterState, FilterValue } from '../data-table.context';
