import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete'
import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { cn } from '@/utils/misc'
import { useEffect, useMemo, useState } from 'react'

const options = [
  {
    value: 'IPv4',
    label: 'IPv4',
  },
  {
    value: 'IPv6',
    label: 'IPv6',
  },
]

export const SelectIPFamily = ({
  defaultValue,
  className,
  onValueChange,
}: {
  defaultValue?: string
  className?: string
  onValueChange: (value: Option) => void
}) => {
  const [value, setValue] = useState(defaultValue)

  const selectedValue = useMemo(() => {
    return options.find((option) => option.value === value)
  }, [value, options])

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue)
    }
  }, [defaultValue])

  return (
    <SelectAutocomplete
      selectedValue={selectedValue}
      triggerClassName={cn('w-full h-auto min-h-10', className)}
      options={options}
      placeholder="Select a IP Family"
      boxClassName="h-[100px]"
      onValueChange={(option) => {
        setValue(option.value)
        onValueChange(option)
      }}
      disableSearch
    />
  )
}
