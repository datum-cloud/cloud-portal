import { MultiSelect, MultiSelectOption } from '@/components/multi-select/multi-select'
import { IGatewayControlResponseLite } from '@/resources/interfaces/gateway.interface'
import { ROUTE_PATH as GATEWAYS_LIST_ROUTE_PATH } from '@/routes/api+/connect+/gateways+/list'
import { useEffect, useState } from 'react'
import { useFetcher } from 'react-router'

export const SelectGateways = ({
  projectId,
  defaultValue,
  onChange,
  ...props
}: {
  projectId?: string
  defaultValue?: string[]
  onChange?: (value: string[]) => void
}) => {
  const fetcher = useFetcher({ key: 'gateways' })

  const [options, setOptions] = useState<MultiSelectOption[]>()
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  const fetchOptions = async (projectId: string) => {
    fetcher.load(`${GATEWAYS_LIST_ROUTE_PATH}?projectId=${projectId}`)
  }

  const handleValueChange = (values: string[]) => {
    setSelectedOptions(values)
    onChange?.(values)
  }

  useEffect(() => {
    if (defaultValue && options?.length) {
      const values = Array.isArray(defaultValue) ? defaultValue : [defaultValue]
      setSelectedOptions(values)
    }
  }, [defaultValue, options])

  useEffect(() => {
    if (projectId) {
      fetchOptions(projectId)
    }
  }, [projectId])

  useEffect(() => {
    if (fetcher.data && fetcher.state === 'idle') {
      const opt = (fetcher.data ?? [])
        .filter(
          (gateway: IGatewayControlResponseLite) =>
            gateway.status?.conditions?.[0]?.status === 'True',
        )
        .map((gateway: IGatewayControlResponseLite) => ({
          value: gateway.name,
          label: gateway.name,
          ...gateway,
        }))

      setOptions(opt)
    }
  }, [fetcher.data, fetcher.state])

  return (
    <MultiSelect
      {...props}
      clickableBadges
      defaultValue={selectedOptions}
      options={options ?? []}
      onValueChange={handleValueChange}
      placeholder="Select gateways"
      boxClassName="max-w-[300px]"
      maxCount={-1}
      showCloseButton={false}
      showClearButton={false}
    />
  )
}
