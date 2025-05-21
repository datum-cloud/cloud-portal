import { PortField } from './port-field'
import { Button } from '@/components/ui/button'
import { PortProtocol } from '@/resources/interfaces/workload.interface'
import { RuntimePortSchema } from '@/resources/schemas/workload.schema'
import { cn } from '@/utils/misc'
import { useForm, useFormMetadata } from '@conform-to/react'
import { PlusIcon, TrashIcon } from 'lucide-react'
import { useEffect } from 'react'

export const PortsForm = ({
  fields,
  defaultValue,
  isEdit = false,
}: {
  fields: ReturnType<typeof useForm<{ ports: RuntimePortSchema[] }>>[1]
  defaultValue?: RuntimePortSchema[]
  isEdit?: boolean
}) => {
  const form = useFormMetadata('workload-form')
  const ports = fields.ports?.getFieldList()

  useEffect(() => {
    if (defaultValue) {
      form.update({
        name: fields.ports.name,
        value: defaultValue as RuntimePortSchema[],
      })
    }
  }, [defaultValue])

  return (
    <div className="flex w-full flex-col gap-2">
      {ports?.length > 0 && (
        <div className="space-y-4">
          {ports?.map((port, index) => {
            const portFields = port.getFieldset()
            return (
              <div
                className="relative flex items-center gap-2 rounded-md border p-4"
                key={port.key}>
                <PortField
                  isEdit={isEdit}
                  defaultValue={defaultValue?.[index]}
                  fields={portFields as ReturnType<typeof useForm<RuntimePortSchema>>[1]}
                />
                {ports.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'text-destructive relative w-fit',
                      (portFields.name.errors ?? []).length > 0 ||
                        (portFields.port.errors ?? []).length > 0 ||
                        (portFields.protocol.errors ?? []).length > 0
                        ? '-top-1'
                        : 'top-2.5',
                    )}
                    onClick={() => form.remove({ name: fields.ports.name, index })}>
                    <TrashIcon className="size-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() =>
          form.insert({
            name: fields.ports.name,
            defaultValue: { name: '', port: 1, protocol: PortProtocol.TCP },
          })
        }>
        <PlusIcon className="size-4" />
        Add Port
      </Button>
    </div>
  )
}
