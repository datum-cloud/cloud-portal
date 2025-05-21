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
  defaultValue,
}: {
  fields: ReturnType<typeof useForm<GatewayTlsSchema>>[1]
  defaultValue?: GatewayTlsSchema
}) => {
  const modeControl = useInputControl(fields.mode)

  useEffect(() => {
    if (defaultValue && !fields.mode.value) {
      modeControl.change(defaultValue?.mode)
    }
  }, [defaultValue, modeControl, fields.mode.value])

  return (
    <Field isRequired label="TLS Mode" errors={fields.mode.errors}>
      <Select
        {...getSelectProps(fields.mode)}
        key={fields.mode.id}
        defaultValue={defaultValue?.mode}
        value={fields.mode.value}
        onValueChange={(value) => {
          modeControl.change(value)
        }}>
        <SelectTrigger>
          <SelectValue placeholder="Select mode" />
        </SelectTrigger>
        <SelectContent>
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
