import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { NetworkDialogForm, NetworkDialogFormRef } from '@/features/network/dialog-form'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { ROUTE_PATH as NETWORKS_LIST_ROUTE_PATH } from '@/routes/api+/connect+/networks+/list'
import { cn } from '@/utils/misc'
import { CheckIcon, ChevronDown, Loader2, PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

export const SelectNetwork = ({
  projectId,
  defaultValue,
  className,
  onValueChange,
  defaultOptions,
  exceptItems,
  name,
  id,
}: {
  projectId?: string
  defaultValue?: string
  className?: string
  onValueChange: (value: Option) => void
  defaultOptions?: Option[]
  exceptItems?: string[]
  name?: string
  id?: string
}) => {
  const fetcher = useFetcher({ key: 'select-network' })

  const [open, setOpen] = useState(false)
  const networkDialogFormRef = useRef<NetworkDialogFormRef>(null)

  const [value, setValue] = useState(defaultValue)
  const [options, setOptions] = useState<Option[]>(defaultOptions ?? [])

  const selectedValue = useMemo(() => {
    return options.find((option) => option.value === value)
  }, [value, options])

  const fetchOptions = async (noCache = false) => {
    fetcher.load(`${NETWORKS_LIST_ROUTE_PATH}?projectId=${projectId}&noCache=${noCache}`)
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
      const opt = (fetcher.data ?? []).map((network: INetworkControlResponse) => ({
        value: network.name,
        label: network.name,
        ...network,
      }))

      setOptions(opt)
    }
  }, [fetcher.data, fetcher.state])

  useEffect(() => {
    if (selectedValue) {
      onValueChange(selectedValue)
    }
  }, [selectedValue])

  const handleNetworkCreated = (newNetwork?: INetworkControlResponse) => {
    if (!newNetwork?.name) return

    const newOption = {
      value: newNetwork.name,
      label: newNetwork.name,
      ...newNetwork,
    }

    setOptions((prevOptions) => {
      if (prevOptions.some((opt) => opt.value === newNetwork.name)) {
        return prevOptions
      }
      return [...prevOptions, newOption]
    })

    setValue(newNetwork.name)

    fetchOptions(true)
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between">
            {selectedValue ? selectedValue?.label : 'Select a Network'}
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
                  <span>Loading networks...</span>
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
              <CommandSeparator />
              <CommandItem
                key="create"
                onSelect={() => networkDialogFormRef.current?.openDialog()}
                className="cursor-pointer">
                <PlusIcon className="size-4" />
                <span>Create Network</span>
              </CommandItem>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <NetworkDialogForm
        ref={networkDialogFormRef}
        projectId={projectId ?? ''}
        onSuccess={handleNetworkCreated}
      />

      {/* Hidden input for form submission */}
      <select
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
