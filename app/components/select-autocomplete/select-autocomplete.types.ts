export type Option = {
  value?: string
  label?: string
  // Allow any additional string fields
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
}
