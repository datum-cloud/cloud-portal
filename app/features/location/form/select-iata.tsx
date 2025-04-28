import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/utils/misc'
import { CheckIcon, ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

const iata = [
  {
    name: 'Dallas Fort Worth Intl',
    city: 'Dallas-Fort Worth',
    country: 'United States',
    iata_code: 'DFW',
  },
  {
    name: 'Heathrow',
    city: 'London',
    country: 'United Kingdom',
    iata_code: 'LHR',
  },
  {
    name: 'Columbia Gorge Regional',
    city: 'The Dalles',
    country: 'United States',
    iata_code: 'DLS',
  },
]

export const SelectIATA = ({
  defaultValue,
  className,
  onValueChange,
  placeholder = 'Select IATA',
  name,
  id,
}: {
  defaultValue?: string
  className?: string
  onValueChange: (value: Option) => void
  placeholder?: string
  name?: string
  id?: string
}) => {
  const [open, setOpen] = useState(false)

  const iataOptions = useMemo(() => {
    return iata.map((i) => ({
      value: i.iata_code,
      label: `${i.name} (${i.iata_code})`,
      ...i,
    }))
  }, [])

  const [value, setValue] = useState(defaultValue)
  const selectedValue = useMemo(() => {
    return iataOptions.find((option) => option.value === value)
  }, [value, iataOptions])

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue)
    }
  }, [defaultValue])

  useEffect(() => {
    if (selectedValue) {
      onValueChange(selectedValue)
    }
  }, [selectedValue])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between">
            {selectedValue ? selectedValue?.label : placeholder}
            <ChevronDown className="size-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('popover-content-width-full min-w-[300px] p-0', className)}
          align="center"
          onEscapeKeyDown={() => setOpen(false)}>
          <Command>
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {iataOptions.length > 0 && (
                <CommandGroup className="max-h-[250px] overflow-y-auto">
                  {iataOptions.map((option) => {
                    const isSelected = selectedValue?.value === option.value
                    return (
                      <CommandItem
                        value={option.value}
                        key={option.value}
                        onSelect={() => {
                          setValue(option.value)
                          setOpen(false)
                        }}
                        className="cursor-pointer justify-between">
                        <span>{option.label}</span>
                        {isSelected && <CheckIcon className="text-primary size-4" />}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Hidden input for form submission */}
      <select
        name={name}
        id={id}
        value={selectedValue?.value ?? ''}
        defaultValue={selectedValue?.value ?? ''}
        className="absolute top-0 left-0 h-0 w-0"
        onChange={() => undefined}>
        <option value=""></option>
        {iataOptions.map((option, idx) => (
          <option key={`${option.value}-${idx}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  )

  /* return (
    <SelectAutocomplete
      name={name}
      id={id}
      isLoading={isLoading}
      keyValue="iata_code"
      selectedValue={selectedValue}
      triggerClassName={cn('w-full h-auto min-h-10', className)}
      options={iataOptions}
      placeholder={placeholder}
      itemPreview={(option) => <span className="font-medium">{option.iata_code}</span>}
      itemContent={(option) => <ItemContent option={option} />}
      onValueChange={(option) => {
        setValue(option.iata_code)
        onValueChange(option)
      }}
      boxClassName="h-[150px]"
    />
  ) */
}
