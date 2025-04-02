import { SelectAutocomplete } from '@/components/select-autocomplete/select-autocomplete'
import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { Button } from '@/components/ui/button'
import { NetworkDialogForm, NetworkDialogFormRef } from '@/features/network/dialog-form'
import { useIsPending } from '@/hooks/useIsPending'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { ROUTE_PATH as NETWORKS_LIST_ROUTE_PATH } from '@/routes/api+/networks+/list'
import { cn } from '@/utils/misc'
import { PlusIcon } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useFetcher } from 'react-router'

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
  const isPending = useIsPending()
  const fetcher = useFetcher({ key: 'select-network' })

  const autocompleteRef = useRef<{ showPopover: (open: boolean) => void }>(null)
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
      <SelectAutocomplete
        disableSearch
        ref={autocompleteRef}
        isLoading={isPending}
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

      <NetworkDialogForm
        ref={networkDialogFormRef}
        projectId={projectId ?? ''}
        onSuccess={handleNetworkCreated}
      />
    </>
  )
}
