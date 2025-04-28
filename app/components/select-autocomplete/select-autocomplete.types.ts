/* eslint-disable @typescript-eslint/no-explicit-any */
export type Option = {
  value?: any
  label?: string
  disabled?: boolean
  // Allow any additional string fields
  [key: string]: any
}

export type SelectAutocompleteProps = {
  keyValue?: string
  options: Option[]
  selectedValue?: Option
  onValueChange?: (value: Option) => void
  placeholder?: string
  triggerClassName?: string
  contentClassName?: string
  itemPreview?: (option: Option) => React.ReactNode
  itemContent?: (option: Option) => React.ReactNode
  emptyContent?: string
  disabled?: boolean
  boxClassName?: string
  disableSearch?: boolean
  itemSize?: number
  isLoading?: boolean
  footer?: React.ReactNode
  name?: string
  id?: string
}
