import { ReactNode } from 'react';

export type FilterValue = Record<string, string | string[] | Date | null | undefined>;

export interface FilterContextValue {
  filters: FilterValue;
  updateFilter: (key: string, value: any) => void;
  clearFilter: (key: string) => void;
  clearAllFilters: () => void;
}

export interface DataTableFilterProps {
  onFiltersChange?: (filters: FilterValue) => void;
  children: ReactNode;
  className?: string;
}

export interface FilterSearchProps {
  placeholder?: string;
  filterKey?: string;
  className?: string;
}

export interface FilterSelectOption {
  label: string;
  value: string;
}

export interface FilterSelectProps {
  options: FilterSelectOption[];
  placeholder?: string;
  filterKey: string;
  multiple?: boolean;
  className?: string;
}

export interface FilterDatePickerProps {
  placeholder?: string;
  filterKey: string;
  mode?: 'single' | 'range';
  className?: string;
}

export interface FilterCustomProps {
  filterKey: string;
  children: (props: {
    value: any;
    onChange: (value: any) => void;
    onClear: () => void;
  }) => ReactNode;
}
