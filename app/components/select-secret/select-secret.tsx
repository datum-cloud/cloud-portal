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
import { ISecretControlResponse } from '@/resources/interfaces/secret.interface'
import { ROUTE_PATH as SECRETS_LIST_ROUTE_PATH } from '@/routes/api+/config+/secrets+/list'
import { cn } from '@/utils/misc'
import { CheckIcon, ChevronDown, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useFetcher } from 'react-router'

export const SelectSecret = ({
  projectId,
  defaultValue,
  className,
  onValueChange,
  defaultOptions,
  exceptItems,
  name,
  id,
  filter,
}: {
  projectId?: string
  defaultValue?: string
  className?: string
  onValueChange: (value?: Option) => void
  defaultOptions?: Option[]
  exceptItems?: string[]
  name?: string
  id?: string
  filter?: Record<string, string>
}) => {
  const fetcher = useFetcher({ key: 'select-secret' })

  const [open, setOpen] = useState(false)

  const [value, setValue] = useState(defaultValue)
  const [options, setOptions] = useState<Option[]>(defaultOptions ?? [])

  const selectedValue = useMemo(() => {
    if (!value) return undefined
    return options.find((option) => option.value === value)
  }, [value, options])

  const fetchOptions = async () => {
    fetcher.load(`${SECRETS_LIST_ROUTE_PATH}?projectId=${projectId}`)
  }

  useEffect(() => {
    if (typeof defaultOptions === 'undefined') {
      fetchOptions()
    } else {
      setOptions(defaultOptions)
    }
  }, [projectId, defaultOptions])

  useEffect(() => {
    if (defaultValue) {
      setValue(defaultValue)
    }
  }, [defaultValue])

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const opt = (fetcher.data ?? [])
        .filter((secret: ISecretControlResponse) => {
          if (!filter) return true
          return Object.entries(filter).every(
            ([key, value]) => secret[key as keyof ISecretControlResponse] === value,
          )
        })
        .map((secret: ISecretControlResponse) => ({
          value: secret.name,
          label: secret.name,
          ...secret,
        }))

      setOptions(opt)
    }
  }, [fetcher.data, fetcher.state])

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
            {selectedValue ? selectedValue?.label : 'Select a Secret'}
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
              {fetcher.state === 'loading' && (
                <CommandItem disabled>
                  <Loader2 className="size-4 animate-spin" />
                  <span>Loading secrets...</span>
                </CommandItem>
              )}
              {options.length > 0 && (
                <CommandGroup className="max-h-[250px] overflow-y-auto">
                  {options.map((option) => {
                    const isSelected = selectedValue?.value === option.value
                    const isDisabled =
                      option.value !== value && exceptItems?.includes(option.value)
                    return (
                      <CommandItem
                        value={option.value}
                        key={option.value}
                        onSelect={() => {
                          setValue(option.value)
                          setOpen(false)
                        }}
                        disabled={isDisabled}
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
