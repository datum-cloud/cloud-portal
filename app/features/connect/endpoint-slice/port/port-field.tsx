import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EndpointSlicePortPort,
  EndpointSlicePortProtocol,
} from '@/resources/interfaces/endpoint-slice.interface'
import { EndpointSlicePortSchema } from '@/resources/schemas/endpoint-slice.schema'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { useEffect } from 'react'

export const PortField = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<EndpointSlicePortSchema>>[1]
  defaultValues?: EndpointSlicePortSchema
}) => {
  const nameControl = useInputControl(fields.name)
  const appProtocolControl = useInputControl(fields.appProtocol)

  useEffect(() => {
    if (defaultValues) {
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.appProtocol && !fields.appProtocol.value) {
        appProtocolControl.change(defaultValues?.appProtocol)
      }
    }
  }, [
    defaultValues,
    nameControl,
    fields.name.value,
    appProtocolControl,
    fields.appProtocol.value,
  ])

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-2">
        <Field isRequired label="Name" errors={fields.name.errors} className="w-3/4">
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            key={fields.name.id}
            placeholder="e.g. port-80"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              nameControl.change(value)
            }}
          />
        </Field>
        <Field
          isRequired
          label="App Protocol"
          errors={fields.appProtocol.errors}
          className="w-1/4"
          description={`Port to listen on: ${EndpointSlicePortPort[fields.appProtocol.value as keyof typeof EndpointSlicePortProtocol]}`}>
          <Select
            {...getSelectProps(fields.appProtocol)}
            key={fields.appProtocol.id}
            value={appProtocolControl.value}
            defaultValue={defaultValues?.appProtocol}
            onValueChange={(value) => {
              appProtocolControl.change(value)
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a storage type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(EndpointSlicePortProtocol).map((protocol) => (
                <SelectItem key={protocol} value={protocol} className="uppercase">
                  {protocol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  )
}
