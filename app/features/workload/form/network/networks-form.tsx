import { NetworkFieldForm } from './network-field'
import { List, ListItem } from '@/components/list/list'
import { Option } from '@/components/select-autocomplete/select-autocomplete.types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { INetworkControlResponse } from '@/resources/interfaces/network.interface'
import { NetworkFieldSchema, NetworksSchema } from '@/resources/schemas/workload.schema'
import { ROUTE_PATH as NETWORKS_LIST_ROUTE_PATH } from '@/routes/api+/networks+/list'
import { cn } from '@/utils/misc'
import { FormMetadata, useForm } from '@conform-to/react'
import { Loader2, PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

export const NetworksForm = ({
  projectId,
  form,
  fields,
  defaultValues,
}: {
  projectId?: string
  form: FormMetadata<NetworksSchema>
  fields: ReturnType<typeof useForm<NetworksSchema>>[1]
  defaultValues?: NetworksSchema
}) => {
  const networks = fields.networks.getFieldList()

  const [networkOptions, setNetworkOptions] = useState<Option[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const selectedNetworks = useMemo(() => {
    // Extract all selected network names from the form fields
    return networks
      .map((network) => {
        const fieldset = network.getFieldset()
        return fieldset.name.value
      })
      .filter(Boolean)
  }, [networks])

  const values = useMemo(() => {
    return defaultValues?.networks
      ? defaultValues.networks
      : ((defaultValues ?? []) as NetworkFieldSchema[])
  }, [defaultValues])

  useEffect(() => {
    form.update({
      name: fields.networks.name,
      value: values as NetworkFieldSchema[],
    })
  }, [values, networkOptions])

  useEffect(() => {
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

      setNetworkOptions(opt)
      setIsLoading(false)
    }
    fetchOptions()
  }, [projectId])

  return (
    <div className="relative flex flex-col gap-4">
      {isLoading && (
        <div className="bg-background/20 absolute inset-0 z-10 flex items-center justify-center backdrop-blur-xs">
          <Loader2 className="size-4 animate-spin" />
        </div>
      )}
      {networks.map((network, index) => {
        const networkFields = network.getFieldset()
        return (
          <div
            className="relative flex items-center gap-2 rounded-md border p-4"
            key={network.key}>
            <NetworkFieldForm
              projectId={projectId}
              networkOptions={networkOptions}
              exceptItems={selectedNetworks as string[]}
              fields={
                networkFields as unknown as ReturnType<
                  typeof useForm<NetworkFieldSchema>
                >[1]
              }
              defaultValues={values?.[index] as NetworkFieldSchema}
            />
            {networks.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className={cn(
                  'text-destructive relative w-fit',
                  (networkFields.name.errors ?? []).length > 0 ||
                    (networkFields.ipFamilies.errors ?? []).length > 0
                    ? '-top-3'
                    : 'top-2.5',
                )}
                onClick={() => form.remove({ name: fields.networks.name, index })}>
                <TrashIcon className="size-4" />
              </Button>
            )}
          </div>
        )
      })}
      {networks.length < networkOptions.length && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() =>
            form.insert({
              name: fields.networks.name,
              defaultValue: { name: '', ipFamilies: [] },
            })
          }>
          <PlusIcon className="size-4" />
          Add Network
        </Button>
      )}
    </div>
  )
}

export const NetworkPreview = ({ values }: { values: NetworksSchema }) => {
  const listItems: ListItem[] = useMemo(() => {
    if ((values.networks ?? []).length > 0) {
      return values.networks
        .filter((network) => network.name !== '')
        .map((network, index) => ({
          label: `Network ${index + 1}`,
          content: (
            <div className="flex items-center gap-2">
              <span className="font-medium">{network.name}</span>
              <Separator orientation="vertical" className="h-4" />
              {network.ipFamilies.map((ipFamily) => (
                <Badge variant="outline" key={ipFamily}>
                  {ipFamily.toUpperCase()}
                </Badge>
              ))}
            </div>
          ),
        }))
    }

    return []
  }, [values])

  return <List items={listItems} itemClassName="!border-b-0 !px-0 py-1.5" />
}
