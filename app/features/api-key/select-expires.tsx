import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { cn } from '@/utils/misc'
import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete'
import { useEffect, useMemo, useState } from 'react'
import { addDays, format, addYears } from 'date-fns'

export const SelectExpires = ({
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
    const now = new Date()
    return [
      {
        value: '30',
        label: '30 days',
        description: `Expires ${format(addDays(now, 30), 'MMM d, yyyy')}`,
      },
      {
        value: '60',
        label: '60 days',
        description: `Expires ${format(addDays(now, 60), 'MMM d, yyyy')}`,
      },
      {
        value: '90',
        label: '90 days',
        description: `Expires ${format(addDays(now, 90), 'MMM d, yyyy')}`,
      },
      {
        value: '365',
        label: '1 year',
        description: `Expires ${format(addYears(now, 1), 'MMM d, yyyy')}`,
      },
      {
        value: '0', // No expiration
        label: 'No Expire',
        description: null,
      },
    ]
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
      <div className="flex flex-col gap-0.5 whitespace-break-spaces text-left">
        <p className="text-sm font-medium">{option.label}</p>
        <p className="text-xs text-muted-foreground">{option.description}</p>
      </div>
    )
  }

  return (
    <SelectAutocomplete
      selectedValue={selectedValue}
      triggerClassName={cn('w-full h-auto min-h-10', className)}
      options={options}
      placeholder="Select expiration"
      boxClassName="h-[250px]"
      onValueChange={(option) => {
        setValue(option.value)
        onValueChange(option)
      }}
      disableSearch
      itemContent={preview}
      itemPreview={preview}
      itemSize={45}
    />
  )
}
