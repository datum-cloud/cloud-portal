import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldMetadata, getSelectProps, useInputControl } from '@conform-to/react'

export const SelectIPFamily = ({
  meta,
  onChange,
}: {
  meta: FieldMetadata<string>
  onChange?: (value: string) => void
}) => {
  const control = useInputControl(meta)

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
        <SelectValue placeholder="Select a IP Family" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
