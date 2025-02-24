import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getSelectProps, FieldMetadata, useInputControl } from '@conform-to/react'

export const SelectIPAM = ({
  meta,
  onChange,
}: {
  meta: FieldMetadata<string>
  onChange?: (value: string) => void
}) => {
  const control = useInputControl(meta)

  const options = [
    {
      value: 'Auto',
      label: 'Auto',
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
      <SelectTrigger
        disabled
        className="h-auto min-h-10 items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
        <SelectValue placeholder="Select a IPAM" />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="w-[var(--radix-select-trigger-width)]">
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
