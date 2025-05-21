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
  GatewayPort,
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
  const allowedRoutesControl = useInputControl(fields.allowedRoutes)
  // const matchLabelsControl = useInputControl(fields.matchLabels)

  const tlsFieldset = fields.tlsConfiguration.getFieldset()

  useEffect(() => {
    if (defaultValues) {
      if (defaultValues.name && fields.name.value === '') {
        nameControl.change(defaultValues?.name)
      }

      if (defaultValues.protocol && !fields.protocol.value) {
        protocolControl.change(defaultValues?.protocol)
      }

      if (defaultValues.allowedRoutes && !fields.allowedRoutes.value) {
        allowedRoutesControl.change(defaultValues?.allowedRoutes)
      }

      /* if (defaultValues.matchLabels && !fields.matchLabels.value) {
        matchLabelsControl.change(defaultValues?.matchLabels)
      } */
    }
  }, [
    defaultValues,
    nameControl,
    fields.name.value,
    protocolControl,
    fields.protocol.value,
    allowedRoutesControl,
    fields.allowedRoutes.value,
    /* matchLabelsControl,
    fields.matchLabels.value, */
  ])

  return (
    <div className="relative flex w-full flex-col items-start gap-4">
      <div className="flex w-full gap-4">
        <Field isRequired label="Name" errors={fields.name.errors} className="w-full">
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
      </div>

      <div className="flex w-full gap-4">
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
              // matchLabelsControl.change([])
            }}>
            <SelectTrigger disabled>
              <SelectValue placeholder="Select allowed routes" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(GatewayAllowedRoutes).map((route) => (
                <SelectItem key={route} value={route}>
                  {route}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          isRequired
          label="Protocol"
          errors={fields.protocol.errors}
          className="w-1/3"
          description={`Port to listen on: ${GatewayPort[fields.protocol.value as keyof typeof GatewayPort]}`}>
          <Select
            {...getSelectProps(fields.protocol)}
            key={fields.protocol.id}
            value={protocolControl.value}
            defaultValue={defaultValues?.protocol}
            onValueChange={(value) => {
              protocolControl.change(value)
            }}>
            <SelectTrigger>
              <SelectValue placeholder="Select a storage type" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(GatewayProtocol).map((protocol) => (
                <SelectItem key={protocol} value={protocol} className="uppercase">
                  {protocol}
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
