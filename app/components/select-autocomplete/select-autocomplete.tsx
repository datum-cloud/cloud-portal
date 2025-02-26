import { Option, SelectAutocompleteProps } from './select-autocomplete.types'
import { VirtualizedList } from './virtualized-list'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/utils/misc'
import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export const SelectAutocomplete = ({
  options,
  keyValue = 'value',
  selectedValue,
  onValueChange,
  placeholder = 'Select...',
  emptyContent = 'No results found',
  triggerClassName,
  contentClassName,
  itemPreview,
  itemContent,
  disabled = false,
  boxClassName,
  disableSearch = false,
  itemSize = 35,
}: SelectAutocompleteProps) => {
  const [open, setOpen] = useState(false)
  const [currentValue, setCurrentValue] = useState<string | undefined>(undefined)

  const handleSelect = (option: Option) => {
    setCurrentValue(option[keyValue])
    setOpen(false)
    onValueChange?.(option)
  }

  const triggerContent = useMemo(() => {
    if (!currentValue) return placeholder
    return itemPreview?.(selectedValue!) ?? selectedValue?.label
  }, [currentValue, placeholder, itemPreview, selectedValue])

  useEffect(() => {
    if (selectedValue) {
      setCurrentValue(selectedValue[keyValue])
    }
  }, [selectedValue])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full items-center justify-between px-3 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
            triggerClassName,
          )}
          disabled={disabled}>
          <div>{triggerContent}</div>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('popover-content-width-full min-w-[300px] p-0', contentClassName)}
        align="center">
        <VirtualizedList
          disableSearch={disableSearch}
          emptyContent={emptyContent}
          keyValue={keyValue}
          options={options}
          selectedValue={selectedValue}
          itemContent={itemContent}
          onValueChange={handleSelect}
          boxClassName={boxClassName}
          itemSize={itemSize}
        />
      </PopoverContent>
    </Popover>
  )
}
