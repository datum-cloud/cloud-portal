import { Field } from '@/components/field/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PortProtocol } from '@/resources/interfaces/workload.interface'
import { RuntimePortSchema } from '@/resources/schemas/workload.schema'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { useEffect, useRef } from 'react'
import { useHydrated } from 'remix-utils/use-hydrated'

export const PortField = ({
  isEdit,
  defaultValues,
  fields,
}: {
  isEdit?: boolean
  defaultValues?: RuntimePortSchema
  fields: ReturnType<typeof useForm<RuntimePortSchema>>[1]
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const isHydrated = useHydrated()

  const nameControl = useInputControl(fields.name)
  const portControl = useInputControl(fields.port)
  const protocolControl = useInputControl(fields.protocol)

  useEffect(() => {
    if (defaultValues) {
      // Only set values if they exist in defaultValues and current fields are empty
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.port && fields.port.value === '') {
        portControl.change(defaultValues?.port.toString())
      }

      if (defaultValues.protocol && !fields.protocol.value) {
        protocolControl.change(defaultValues?.protocol)
      }
    }
  }, [
    defaultValues,
    portControl,
    protocolControl,
    nameControl,
    fields.name.value,
    fields.port.value,
    fields.protocol.value,
  ])

  useEffect(() => {
    // Focus the input when the form is hydrated
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    isHydrated && inputRef.current?.focus()
  }, [isHydrated])

  return (
    <div className="relative flex w-full items-start gap-4">
      <Field isRequired label="Name" errors={fields.name.errors} className="flex-1">
        <Input
          {...getInputProps(fields.name, { type: 'text' })}
          ref={isEdit ? undefined : inputRef}
          key={fields.name.id}
          placeholder="e.g. port-1"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            nameControl.change(value)
          }}
        />
      </Field>
      <Field isRequired label="Port" errors={fields.port.errors} className="w-1/5">
        <Input
          {...getInputProps(fields.port, {
            type: 'number',
            min: 1,
            max: 65535,
          })}
          min={1}
          max={65535}
          key={fields.port.id}
          placeholder="e.g. 80"
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const value = (e.target as HTMLInputElement).value
            portControl.change(value)
          }}
        />
      </Field>
      <Field
        isRequired
        label="Protocol"
        errors={fields.protocol.errors}
        className="w-1/5">
        <Select
          {...getSelectProps(fields.protocol)}
          key={fields.protocol.id}
          value={protocolControl.value}
          defaultValue={defaultValues?.protocol}
          onValueChange={protocolControl.change}>
          <SelectTrigger className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
            <SelectValue placeholder="Select a protocol" />
          </SelectTrigger>
          <SelectContent className="w-[var(--radix-select-trigger-width)]">
            {Object.keys(PortProtocol).map((protocol) => (
              <SelectItem key={protocol} value={protocol}>
                {protocol}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </div>
  )
}
