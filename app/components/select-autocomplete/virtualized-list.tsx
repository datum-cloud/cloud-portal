import { Option } from './select-autocomplete.types'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { cn } from '@/utils/misc'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CheckIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export const VirtualizedList = ({
  options,
  keyValue = 'value',
  selectedValue,
  onValueChange,
  itemContent,
  emptyContent = 'No results found.',
  boxClassName,
  disableSearch = false,
  itemSize = 35,
}: {
  options: Option[]
  keyValue?: string
  selectedValue?: Option
  onValueChange?: (option: Option) => void
  itemContent?: (option: Option) => React.ReactNode
  emptyContent?: string
  boxClassName?: string
  disableSearch?: boolean
  itemSize?: number
}) => {
  const [filteredOptions, setFilteredOptions] = useState<Option[]>(options)
  const [focusedIndex, setFocusedIndex] = useState(0)
  const [isKeyboardNavActive, setIsKeyboardNavActive] = useState(false)

  const parentRef = useRef(null)

  const virtualizer = useVirtualizer({
    count: filteredOptions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => itemSize ?? 35,
  })

  const virtualOptions = virtualizer.getVirtualItems()

  const scrollToIndex = (index: number) => {
    virtualizer.scrollToIndex(index, {
      align: 'center',
    })
  }

  const handleSearch = (search: string) => {
    setIsKeyboardNavActive(false)
    setFilteredOptions(
      options.filter((option) => {
        const searchLower = search.toLowerCase()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        return Object.entries(option).some(([_, value]) => {
          // Only filter string values
          if (typeof value === 'string') {
            return value.toLowerCase().includes(searchLower)
          }
          return false
        })
      }),
    )
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown': {
        event.preventDefault()
        setIsKeyboardNavActive(true)
        setFocusedIndex((prev) => {
          const newIndex =
            prev === -1 ? 0 : Math.min(prev + 1, filteredOptions.length - 1)
          scrollToIndex(newIndex)
          return newIndex
        })
        break
      }
      case 'ArrowUp': {
        event.preventDefault()
        setIsKeyboardNavActive(true)
        setFocusedIndex((prev) => {
          const newIndex =
            prev === -1 ? filteredOptions.length - 1 : Math.max(prev - 1, 0)
          scrollToIndex(newIndex)
          return newIndex
        })
        break
      }
      case 'Enter': {
        event.preventDefault()
        if (filteredOptions[focusedIndex]) {
          onValueChange?.(filteredOptions[focusedIndex])
        }
        break
      }
      default:
        break
    }
  }

  useEffect(() => {
    if (selectedValue) {
      const option = filteredOptions.find(
        (option) => option[keyValue] === selectedValue[keyValue],
      )
      if (option) {
        const index = filteredOptions.indexOf(option)
        setFocusedIndex(index)
        virtualizer.scrollToIndex(index, {
          align: 'center',
        })
      }
    }
  }, [selectedValue, filteredOptions, virtualizer])

  return (
    <Command shouldFilter={false} onKeyDown={handleKeyDown}>
      {!disableSearch && (
        <CommandInput onValueChange={handleSearch} placeholder="Search..." />
      )}
      <CommandList
        ref={parentRef}
        className={cn('h-[200px] w-full min-w-[300px] overflow-auto', boxClassName)}
        onMouseDown={() => setIsKeyboardNavActive(false)}
        onMouseMove={() => setIsKeyboardNavActive(false)}>
        <CommandEmpty>{emptyContent}</CommandEmpty>

        <CommandGroup>
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
            }}
            className="relative w-full">
            {virtualOptions.map((virtualOption) => {
              const option = filteredOptions[virtualOption.index]
              const isSelected = option[keyValue] === selectedValue?.[keyValue]
              return (
                <CommandItem
                  key={option[keyValue]}
                  disabled={isKeyboardNavActive}
                  onMouseEnter={() =>
                    !isKeyboardNavActive && setFocusedIndex(virtualOption.index)
                  }
                  onMouseLeave={() => !isKeyboardNavActive && setFocusedIndex(-1)}
                  onSelect={() => {
                    onValueChange?.(option)
                  }}
                  className={cn(
                    'absolute top-0 left-0 w-full bg-transparent',
                    isKeyboardNavActive &&
                      focusedIndex !== virtualOption.index &&
                      'aria-selected:text-primary aria-selected:bg-transparent',
                  )}
                  style={{
                    minHeight: `${virtualOption.size}px`,
                    transform: `translateY(${virtualOption.start}px)`,
                  }}>
                  <div className="flex w-full items-center justify-between">
                    <div>{itemContent ? itemContent(option) : option.label}</div>
                    <div className="w-4">
                      {isSelected && <CheckIcon className="text-primary size-4" />}
                    </div>
                  </div>
                </CommandItem>
              )
            })}
          </div>
        </CommandGroup>
      </CommandList>
    </Command>
  )
}
