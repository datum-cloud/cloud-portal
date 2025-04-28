import { TlsConfiguration } from './tls-configuration'
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
  GatewayAllowedRoutes,
  GatewayProtocol,
} from '@/resources/interfaces/gateway.interface'
import {
  GatewayListenerFieldSchema,
  GatewayTlsSchema,
} from '@/resources/schemas/gateway.schema'
import {
  getInputProps,
  getSelectProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { useEffect } from 'react'

export const ListenerField = ({
  fields,
  defaultValues,
}: {
  fields: ReturnType<typeof useForm<GatewayListenerFieldSchema>>[1]
  defaultValues?: GatewayListenerFieldSchema
}) => {
  const nameControl = useInputControl(fields.name)
  const protocolControl = useInputControl(fields.protocol)
  const portControl = useInputControl(fields.port)
  const allowedRoutesControl = useInputControl(fields.allowedRoutes)
  const matchLabelsControl = useInputControl(fields.matchLabels)

  const tlsFieldset = fields.tlsConfiguration.getFieldset()

  useEffect(() => {
    if (defaultValues) {
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.protocol && !fields.protocol.value) {
        protocolControl.change(defaultValues?.protocol)
      }

      if (defaultValues.port && fields.port.value === '') {
        portControl.change(defaultValues?.port.toString())
      }

      if (defaultValues.allowedRoutes && !fields.allowedRoutes.value) {
        allowedRoutesControl.change(defaultValues?.allowedRoutes)
      }

      if (defaultValues.matchLabels && !fields.matchLabels.value) {
        matchLabelsControl.change(defaultValues?.matchLabels)
      }
    }
  }, [
    defaultValues,
    nameControl,
    fields.name.value,
    protocolControl,
    fields.protocol.value,
    portControl,
    fields.port.value,
    allowedRoutesControl,
    fields.allowedRoutes.value,
    matchLabelsControl,
    fields.matchLabels.value,
  ])

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-2">
        <Field isRequired label="Name" errors={fields.name.errors} className="w-1/2">
          <Input
            {...getInputProps(fields.name, { type: 'text' })}
            key={fields.name.id}
            placeholder="e.g. listener-3sd122"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              const value = (e.target as HTMLInputElement).value
              nameControl.change(value)
            }}
          />
        </Field>

        <Field
          isRequired
          label="Protocol"
          errors={fields.protocol.errors}
          className="w-1/4">
          <Select
            {...getSelectProps(fields.protocol)}
            key={fields.protocol.id}
            value={protocolControl.value}
            defaultValue={defaultValues?.protocol}
            onValueChange={(value) => {
              protocolControl.change(value)
            }}>
            <SelectTrigger className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
              <SelectValue placeholder="Select a storage type" />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {Object.values(GatewayProtocol).map((protocol) => (
                <SelectItem key={protocol} value={protocol} className="uppercase">
                  {protocol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field isRequired label="Port" errors={fields.port.errors} className="w-1/4">
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
      </div>

      <div className="flex w-full gap-2">
        <Field
          isRequired
          label="Allowed Routes"
          errors={fields.allowedRoutes.errors}
          className="w-1/3">
          <Select
            {...getSelectProps(fields.allowedRoutes)}
            key={fields.allowedRoutes.id}
            value={fields.allowedRoutes.value}
            defaultValue={defaultValues?.allowedRoutes}
            onValueChange={(value) => {
              allowedRoutesControl.change(value)

              // Clear match labels when allowed routes is changed
              matchLabelsControl.change([])
            }}>
            <SelectTrigger
              disabled
              className="h-auto min-h-10 w-full items-center justify-between px-3 text-sm font-medium [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0">
              <SelectValue placeholder="Select allowed routes" />
            </SelectTrigger>
            <SelectContent className="w-[var(--radix-select-trigger-width)]">
              {Object.values(GatewayAllowedRoutes).map((route) => (
                <SelectItem key={route} value={route}>
                  {route}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {/* Enable match labels when allowed routes is selector available */}
        {/* {fields.allowedRoutes.value === GatewayAllowedRoutes.SELECTOR && (
          <Field
            isRequired={fields.allowedRoutes.value === GatewayAllowedRoutes.SELECTOR}
            label="Match Labels"
            errors={fields.matchLabels.errors}
            className="w-2/3">
            <SelectLabels
              defaultValue={fields.matchLabels.value as string[]}
              onChange={(value) => {
                matchLabelsControl.change(value)
              }}
            />
          </Field>
        )} */}

        {fields.protocol.value === GatewayProtocol.HTTPS && (
          <div className="w-1/3">
            <TlsConfiguration
              fields={
                tlsFieldset as unknown as ReturnType<typeof useForm<GatewayTlsSchema>>[1]
              }
              defaultValues={defaultValues?.tlsConfiguration}
            />
          </div>
        )}
      </div>
    </div>
  )
}
