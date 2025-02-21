import { ColumnDef, ColumnFiltersState, SortingState } from '@tanstack/react-table'
import { JSX } from 'react'

export type SearchParams = {
  [key: string]: string | string[] | undefined
}

export type DatePreset = {
  label: string
  from: Date
  to: Date
  shortcut: string
}

// TODO: we could type the value(!) especially when using enums
export type Option = {
  label: string
  value: string | boolean | number | undefined
}

export type Input = {
  type: 'input'
  options?: Option[]
}

export type Checkbox = {
  type: 'checkbox'
  component?: (props: Option) => JSX.Element | null
  options?: Option[]
}

export type Slider = {
  type: 'slider'
  min: number
  max: number
  // if options is undefined, we will provide all the steps between min and max
  options?: Option[]
}

export type Timerange = {
  type: 'timerange'
  options?: Option[] // required for TS
  presets?: DatePreset[]
}

export type Base<TData> = {
  label: string
  value: keyof TData
  /**
   * Defines if the accordion in the filter bar is open by default
   */
  defaultOpen?: boolean
  /**
   * Defines if the command input is disabled for this field
   */
  commandDisabled?: boolean
}

export type DataTableCheckboxFilterField<TData> = Base<TData> & Checkbox
export type DataTableSliderFilterField<TData> = Base<TData> & Slider
export type DataTableInputFilterField<TData> = Base<TData> & Input
export type DataTableTimerangeFilterField<TData> = Base<TData> & Timerange

export type DataTableFilterField<TData> =
  | DataTableCheckboxFilterField<TData>
  | DataTableSliderFilterField<TData>
  | DataTableInputFilterField<TData>
  | DataTableTimerangeFilterField<TData>

// Interface Section
export interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  defaultColumnFilters?: ColumnFiltersState
  defaultSorting?: SortingState
  // TODO: add sortingColumnFilters
  filterFields?: DataTableFilterField<TData>[]
  className?: string
  rowActions?: DataTableRowActionsProps<TData>[]
  tableTitle?: DataTableTitleProps
  isLoading?: boolean
  loadingText?: string
  emptyText?: string
}

export interface DataTableRowActionsProps<TData> {
  key: string
  label: string
  variant?: 'default' | 'destructive'
  icon?: React.ReactNode
  className?: string
  action: (row: TData) => void | Promise<void>
}

export interface DataTableTitleProps {
  title?: string
  description?: string
  actions?: React.ReactNode
}
