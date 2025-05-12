import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FieldMetadata, getSelectProps, useInputControl } from '@conform-to/react'

export const SelectAddressType = ({ meta }: { meta: FieldMetadata<string> }) => {
  const control = useInputControl(meta)

  const options = [
    {
      value: 'FQDN',
      label: 'FQDN',
    },
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
      onValueChange={(value) => control.change(value)}
      key={meta.id}
      defaultValue={meta.value?.toString()}>
      <SelectTrigger disabled>
        <SelectValue placeholder="Select a Address Type" />
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
