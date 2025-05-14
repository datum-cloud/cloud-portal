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
import { CheckIcon, ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export interface SelectBoxOption {
  value: string
  label: string
  disabled?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

export const SelectBox = ({
  value,
  className,
  onChange,
  options,
  name,
  id,
  placeholder = 'Select a option',
  disabled = false,
  isLoading = false,
}: {
  value?: string
  className?: string
  onChange: (value: SelectBoxOption) => void
  options: SelectBoxOption[]
  name?: string
  id?: string
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
}) => {
  const [open, setOpen] = useState(false)
  const [initValue, setInitValue] = useState(value)

  const selectedValue = useMemo(() => {
    if (!initValue) return undefined
    return options.find((option) => option.value === initValue)
  }, [initValue, options])

  useEffect(() => {
    if (value) {
      setInitValue(value)
    }
  }, [value])

  useEffect(() => {
    if (selectedValue) {
      onChange(selectedValue)
    }
  }, [selectedValue])

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            disabled={disabled || isLoading}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="relative w-full justify-between">
            {selectedValue ? selectedValue?.label : placeholder}
            <ChevronDown className="size-4 opacity-50" />
            {isLoading && (
              <Loader2 className="absolute top-1/2 left-1/2 size-4 -translate-x-1/2 -translate-y-1/2 animate-spin" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('popover-content-width-full min-w-[300px] p-0', className)}
          align="center"
          onEscapeKeyDown={() => setOpen(false)}>
          <Command>
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              {options.length > 0 && (
                <CommandGroup className="max-h-[250px] overflow-y-auto">
                  {options.map((option: SelectBoxOption) => {
                    const isSelected = selectedValue?.value === option.value
                    return (
                      <CommandItem
                        value={option.value}
                        key={option.value}
                        onSelect={() => {
                          setInitValue(option.value)
                          setOpen(false)
                        }}
                        disabled={option.disabled}
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
        aria-hidden={true}
        multiple={false}
        name={name}
        id={id}
        value={selectedValue?.value ?? ''}
        defaultValue={undefined}
        className="absolute top-0 left-0 h-0 w-0"
        onChange={() => undefined}>
        <option value=""></option>
        {options.map((option, idx) => (
          <option key={`${option.value}-${idx}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </>
  )
}
