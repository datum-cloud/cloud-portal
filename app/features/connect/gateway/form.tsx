import { ListenersForm } from './listener/listeners-form'
import { MetadataForm } from '@/components/metadata/metadata-form'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useIsPending } from '@/hooks/useIsPending'
import {
  GatewayProtocol,
  GatewayAllowedRoutes,
  GatewayTlsMode,
  IGatewayControlResponse,
} from '@/resources/interfaces/gateway.interface'
import {
  GatewayListenerFieldSchema,
  GatewayListenerSchema,
  GatewaySchema,
  gatewaySchema,
} from '@/resources/schemas/gateway.schema'
import { MetadataSchema } from '@/resources/schemas/metadata.schema'
import { convertObjectToLabels } from '@/utils/misc'
import { FormProvider, getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { get } from 'es-toolkit/compat'
import { useEffect, useMemo, useState } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const GatewayForm = ({
  defaultValue,
}: {
  defaultValue?: IGatewayControlResponse
}) => {
  const navigate = useNavigate()
  const isPending = useIsPending()

  const [formattedValues, setFormattedValues] = useState<GatewaySchema>()
  const [form, fields] = useForm({
    id: 'gateway-form',
    constraint: getZodConstraint(gatewaySchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: gatewaySchema })
    },
  })

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined
  }, [defaultValue])

  useEffect(() => {
    if (defaultValue && defaultValue.name) {
      const metadata = {
        name: defaultValue.name,
        labels: convertObjectToLabels(defaultValue.labels ?? {}),
        annotations: convertObjectToLabels(defaultValue.annotations ?? {}),
      }

      const listeners: GatewayListenerFieldSchema[] = (defaultValue?.listeners ?? []).map(
        (listener) => {
          const from = get(
            listener,
            'allowedRoutes.namespaces.from',
            GatewayAllowedRoutes.SAME,
          )
          const matchLabels = get(
            listener,
            'allowedRoutes.namespaces.selector.matchLabels',
            {},
          )

          const tls =
            listener.protocol === GatewayProtocol.HTTPS
              ? {
                  mode: get(listener, 'tlsConfiguration.mode', GatewayTlsMode.TERMINATE),
                }
              : undefined

          return {
            name: listener.name ?? '',
            port: listener.port ?? 80,
            protocol: listener.protocol ?? '',
            allowedRoutes: from,
            matchLabels: from === 'Selector' ? convertObjectToLabels(matchLabels) : [],
            tlsConfiguration: tls,
          }
        },
      )

      setFormattedValues({
        ...metadata,
        listeners,
      })
    }
  }, [defaultValue])

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} gateway</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the gateway with the new values below.'
            : 'Create a new gateway to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <FormProvider context={form.context}>
        <Form
          {...getFormProps(form)}
          id={form.id}
          method="POST"
          autoComplete="off"
          className="flex flex-col gap-6">
          <AuthenticityTokenInput />

          <CardContent className="space-y-4">
            <MetadataForm
              fields={fields as unknown as ReturnType<typeof useForm<MetadataSchema>>[1]}
              defaultValues={formattedValues as MetadataSchema}
              isEdit={isEdit}
            />
            <ListenersForm
              fields={
                fields as unknown as ReturnType<typeof useForm<GatewayListenerSchema>>[1]
              }
              defaultValues={{ listeners: formattedValues?.listeners ?? [] }}
            />
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button
              type="button"
              variant="link"
              disabled={isPending}
              onClick={() => {
                navigate(-1)
              }}>
              Return to List
            </Button>
            <Button
              variant="default"
              type="submit"
              disabled={isPending}
              isLoading={isPending}>
              {isPending
                ? `${isEdit ? 'Saving' : 'Creating'}`
                : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  )
}
