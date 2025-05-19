import { SelectBox, SelectBoxOption } from '@/components/select-box/select-box'
import { IEndpointSliceControlResponseLite } from '@/resources/interfaces/endpoint-slice.interface'
import { ROUTE_PATH as ENDPOINT_SLICES_LIST_ROUTE_PATH } from '@/routes/api+/connect+/endpoint-slices+/list'
import { useEffect, useMemo, useState } from 'react'
import { useFetcher } from 'react-router'

export const SelectEndpointSlice = ({
  projectId,
  value,
  className,
  onValueChange,
  name,
  id,
  exceptItems = [],
}: {
  projectId?: string
  value?: string
  className?: string
  onValueChange: (value?: SelectBoxOption) => void
  name?: string
  id?: string
  exceptItems?: string[]
}) => {
  const fetcher = useFetcher({ key: 'select-endpoint-slices' })
  const [options, setOptions] = useState<SelectBoxOption[]>([])

  const fetchOptions = async () => {
    fetcher.load(`${ENDPOINT_SLICES_LIST_ROUTE_PATH}?projectId=${projectId}`)
  }

  useEffect(() => {
    if (projectId) {
      fetchOptions()
    }
  }, [projectId])

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const opt = (fetcher.data ?? []).map(
        (endpointSlice: IEndpointSliceControlResponseLite) => ({
          value: endpointSlice.name,
          label: endpointSlice.name,
          ...endpointSlice,
        }),
      )

      setOptions(opt)
    }
  }, [fetcher.data, fetcher.state])

  const filteredOpt = useMemo(() => {
    return options.map((opt) => {
      return {
        ...opt,
        disabled: exceptItems?.includes(opt.value) && opt.value !== value,
      }
    })
  }, [options, exceptItems, value])

  return (
    <SelectBox
      value={value}
      className={className}
      onChange={(value: SelectBoxOption) => {
        if (value) {
          onValueChange(value)
        }
      }}
      options={filteredOpt}
      name={name}
      id={id}
      placeholder="Select a Endpoint Slice"
      isLoading={fetcher.state === 'loading'}
    />
  )
}
