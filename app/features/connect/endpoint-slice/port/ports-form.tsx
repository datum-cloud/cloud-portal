import { PortField } from './port-field'
import { FieldLabel } from '@/components/field/field-label'
import { Button } from '@/components/ui/button'
import { EndpointSlicePortProtocol } from '@/resources/interfaces/endpoint-slice.interface'
import {
  EndpointSlicePortSchema,
  EndpointSliceSchema,
} from '@/resources/schemas/endpoint-slice.schema'
import { cn } from '@/utils/misc'
import { useForm, useFormMetadata } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect } from 'react'

const defaultValue: EndpointSlicePortSchema = {
  name: '',
  appProtocol: EndpointSlicePortProtocol.HTTPS,
}

export const PortsForm = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<EndpointSliceSchema>>[1]
  defaultValues?: EndpointSlicePortSchema[]
}) => {
  const form = useFormMetadata('endpoint-slice-form')
  const portList = fields.ports.getFieldList()

  useEffect(() => {
    if (defaultValues && defaultValues.length > 0) {
      form.update({
        name: fields.ports.name,
        value: defaultValues,
      })
    } else if (portList.length === 0) {
      form.insert({
        name: fields.ports.name,
        defaultValue: defaultValue,
      })
    }
  }, [defaultValues])

  return (
    <div className="flex flex-col gap-3">
      <FieldLabel label="Ports" />

      <div className="space-y-4">
        {portList.map((port, index) => {
          const portFields = port.getFieldset()
          return (
            <div
              className="relative flex items-center gap-2 rounded-md border p-4"
              key={port.key}>
              <PortField
                fields={
                  portFields as unknown as ReturnType<
                    typeof useForm<EndpointSlicePortSchema>
                  >[1]
                }
                defaultValues={defaultValues?.[index]}
              />
              {portList.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={cn('text-destructive relative top-2 w-fit')}
                  onClick={() => form.remove({ name: fields.ports.name, index })}>
                  <TrashIcon className="size-4" />
                </Button>
              )}
            </div>
          )
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="ml-1 w-fit"
        onClick={() =>
          form.insert({
            name: fields.ports.name,
            defaultValue: defaultValue,
          })
        }>
        <PlusIcon className="size-4" />
        Add
      </Button>
    </div>
  )
}
