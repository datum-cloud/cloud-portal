import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import IATA_CODES from '@/constants/json/iata.json'
import { cn } from '@/utils/misc'
import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete'
import { Slash } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const ItemContent = ({ option }: { option: Option }) => {
  return (
    <div className="flex w-full items-center gap-0.5">
      <span className="font-medium">
        {option.name} ({option.iata_code})
      </span>
      <Slash className="mx-0.5 !size-3 !text-muted-foreground" />
      <span className="text-sm text-muted-foreground">
        {option.city}, {option.country}
      </span>
    </div>
  )
}

export const SelectIATA = ({
  defaultValue,
  className,
  onValueChange,
  placeholder = 'Select IATA',
}: {
  defaultValue?: string
  className?: string
  onValueChange: (value: Option) => void
  placeholder?: string
}) => {
  const [value, setValue] = useState(defaultValue)
  const selectedValue = useMemo(() => {
    return IATA_CODES.find((option) => option.iata_code === value)
  }, [value])

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue)
    }
  }, [defaultValue])

  return (
    <SelectAutocomplete
      keyValue="iata_code"
      selectedValue={selectedValue}
      triggerClassName={cn('w-full h-auto min-h-10', className)}
      options={IATA_CODES}
      placeholder={placeholder}
      itemPreview={(option) => <ItemContent option={option} />}
      itemContent={(option) => <ItemContent option={option} />}
      onValueChange={(option) => {
        setValue(option.iata_code)
        onValueChange(option)
      }}
    />
  )
}
