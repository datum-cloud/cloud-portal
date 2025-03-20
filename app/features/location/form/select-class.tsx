import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete'
import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { LOCATION_CLASSES } from '@/constants/options'
import { cn } from '@/utils/misc'
import { useEffect, useMemo, useState } from 'react'

export const SelectLocationClass = ({
  defaultValue,
  className,
  onValueChange,
}: {
  defaultValue?: string
  className?: string
  onValueChange: (value: Option) => void
}) => {
  const [value, setValue] = useState(defaultValue)

  const options = useMemo(() => {
    return Object.keys(LOCATION_CLASSES).map((value: string) => ({
      value,
      label: LOCATION_CLASSES[value as keyof typeof LOCATION_CLASSES].label,
      description: LOCATION_CLASSES[value as keyof typeof LOCATION_CLASSES].description,
    }))
  }, [])

  const selectedValue = useMemo(() => {
    return options.find((option) => option.value === value)
  }, [value, options])

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue)
    }
  }, [defaultValue])

  const preview = (option: Option) => {
    return (
      <div className="flex flex-col gap-0.5 text-left whitespace-break-spaces">
        <p className="text-sm font-medium">{option.label}</p>
        <p className="text-muted-foreground text-xs">{option.description}</p>
      </div>
    )
  }

  return (
    <SelectAutocomplete
      selectedValue={selectedValue}
      triggerClassName={cn('w-full h-auto min-h-10', className)}
      options={options}
      placeholder="Select a class"
      boxClassName="h-[150px]"
      onValueChange={(option) => {
        setValue(option.value)
        onValueChange(option)
      }}
      disableSearch
      itemContent={preview}
      itemPreview={preview}
      itemSize={70}
    />
  )
}
