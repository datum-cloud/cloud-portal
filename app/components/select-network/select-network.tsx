import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete'
import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { Button } from '@/components/ui/button'
import { NetworkDialogForm, NetworkDialogFormRef } from '@/features/network/dialog-form'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { ROUTE_PATH as NETWORKS_LIST_ROUTE_PATH } from '@/routes/api+/networks+/list'
import { cn } from '@/utils/misc'
import { PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

export const SelectNetwork = ({
  projectId,
  defaultValue,
  className,
  onValueChange,
  defaultOptions,
  exceptItems,
}: {
  projectId?: string
  defaultValue?: string
  className?: string
  onValueChange: (value: Option) => void
  defaultOptions?: Option[]
  exceptItems?: string[]
}) => {
  const autocompleteRef = useRef<{ showPopover: (open: boolean) => void }>(null)
  const networkDialogFormRef = useRef<NetworkDialogFormRef>(null)
  const [value, setValue] = useState(defaultValue)
  const [options, setOptions] = useState<Option[]>(defaultOptions ?? [])
  const [isLoading, setIsLoading] = useState(false)

  const selectedValue = useMemo(() => {
    return options.find((option) => option.value === value)
  }, [value, options])

  const fetchOptions = async () => {
    setIsLoading(true)
    const response = await fetch(`${NETWORKS_LIST_ROUTE_PATH}?projectId=${projectId}`, {
      method: 'GET',
    })
    const data = await response.json()

    const opt = data.map((network: INetworkControlResponse) => ({
      value: network.name,
      label: network.name,
      ...network,
    }))

    setOptions(opt)
    setIsLoading(false)
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
    if (value) {
      const selected = options.find((option) => option.value === value)
      if (selected) {
        onValueChange(selected)
      }
    }
  }, [value, options])

  return (
    <>
      <SelectAutocomplete
        disableSearch
        ref={autocompleteRef}
        isLoading={isLoading}
        selectedValue={selectedValue}
        triggerClassName={cn('w-full h-auto min-h-10', className)}
        placeholder="Select a Network"
        options={options.map((option) => ({
          ...option,
          disabled: option.value !== value && exceptItems?.includes(option.value),
        }))}
        onValueChange={(option) => {
          setValue(option.value)
        }}
        footer={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="flex w-full items-center justify-start gap-2 px-3 font-normal"
            onClick={() => networkDialogFormRef.current?.openDialog()}>
            <PlusIcon className="size-4" />
            <span>Create Network</span>
          </Button>
        }
      />

      <NetworkDialogForm projectId={projectId ?? ''} ref={networkDialogFormRef} />
    </>
  )
}
