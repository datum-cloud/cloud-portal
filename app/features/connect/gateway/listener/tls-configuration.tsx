import { Field } from '@/components/field/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { GatewayTlsMode } from '@/resources/interfaces/gateway.interface'
import { GatewayTlsSchema } from '@/resources/schemas/gateway.schema'
import { useForm, getSelectProps, useInputControl } from '@conform-to/react'
import { useEffect } from 'react'

export const TlsConfiguration = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<GatewayTlsSchema>>[1]
  defaultValues?: GatewayTlsSchema
}) => {
  const modeControl = useInputControl(fields.mode)

  useEffect(() => {
    if (defaultValues && !fields.mode.value) {
      modeControl.change(defaultValues?.mode)
    }
  }, [defaultValues, modeControl, fields.mode.value])

  return (
    <Field isRequired label="TLS Mode" errors={fields.mode.errors}>
      <Select
        {...getSelectProps(fields.mode)}
        key={fields.mode.id}
        defaultValue={defaultValues?.mode}
        value={fields.mode.value}
        onValueChange={(value) => {
          modeControl.change(value)
        }}>
        <SelectTrigger className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
          <SelectValue placeholder="Select mode" />
        </SelectTrigger>
        <SelectContent className="w-[var(--radix-select-trigger-width)]">
          {Object.values(GatewayTlsMode).map((mode) => (
            <SelectItem key={mode} value={mode}>
              {mode}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}
