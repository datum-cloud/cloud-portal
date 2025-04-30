import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldMetadata, getSelectProps, useInputControl } from '@conform-to/react'
import { addDays, addYears, format } from 'date-fns'
import { useMemo } from 'react'

export const SelectExpires = ({
  meta,
  onChange,
}: {
  meta: FieldMetadata<string>
  onChange?: (value: string) => void
}) => {
  const control = useInputControl(meta)

  const options = useMemo(() => {
    const now = new Date()
    return [
      {
        value: 30,
        label: '30 days',
        description: `Expires ${format(addDays(now, 30), 'MMM d, yyyy')}`,
      },
      {
        value: 60,
        label: '60 days',
        description: `Expires ${format(addDays(now, 60), 'MMM d, yyyy')}`,
      },
      {
        value: 90,
        label: '90 days',
        description: `Expires ${format(addDays(now, 90), 'MMM d, yyyy')}`,
      },
      {
        value: 365,
        label: '1 year',
        description: `Expires ${format(addYears(now, 1), 'MMM d, yyyy')}`,
      },
      {
        value: 0, // No expiration
        label: 'No Expire',
        description: null,
      },
    ]
  }, [])

  return (
    <Select
      {...getSelectProps(meta)}
      onValueChange={(value) => {
        control.change(value)
        onChange?.(value)
      }}
      key={meta.id}
      defaultValue={meta.value?.toString()}>
      <SelectTrigger>
        <SelectValue placeholder="Select a expiration" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value.toString()}
            className="w-[var(--radix-select-trigger-width)]">
            <div className="flex flex-col gap-0.5 text-left whitespace-break-spaces">
              <p className="text-sm font-medium">{option.label}</p>
              <p className="text-muted-foreground text-xs">{option.description}</p>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
