import { EndpointsForm } from './endpoint/endpoints-form'
import { PortsForm } from './port/ports-form'
import { SelectAddressType } from './select-address-type'
import { Field } from '@/components/field/field'
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
  EndpointSliceAddressType,
  IEndpointSliceControlResponse,
} from '@/resources/interfaces/endpoint-slice.interface'
import {
  EndpointSliceSchema,
  endpointSliceSchema,
} from '@/resources/schemas/endpoint-slice.schema'
import { MetadataSchema } from '@/resources/schemas/metadata.schema'
import { FormProvider, getFormProps, useForm } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useMemo, useState } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const EndpointSliceForm = ({
  defaultValue,
}: {
  defaultValue?: IEndpointSliceControlResponse
}) => {
  const navigate = useNavigate()
  const isPending = useIsPending()

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formattedValues, setFormattedValues] = useState<EndpointSliceSchema>()
  const [form, fields] = useForm({
    id: 'endpoint-slice-form',
    constraint: getZodConstraint(endpointSliceSchema),
    defaultValue: {
      addressType: EndpointSliceAddressType.FQDN,
    },
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: endpointSliceSchema })
    },
  })

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined
  }, [defaultValue])
  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>Create a new Endpoint Slice</CardTitle>
        <CardDescription>
          Create a new Endpoint Slice to get started with Datum Cloud.
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
            <Field
              isRequired
              label="Address Type"
              errors={fields.addressType.errors}
              className="w-1/4">
              <SelectAddressType meta={fields.addressType} />
            </Field>
            <EndpointsForm
              fields={
                fields as unknown as ReturnType<typeof useForm<EndpointSliceSchema>>[1]
              }
              defaultValues={formattedValues?.endpoints}
            />
            <PortsForm
              fields={
                fields as unknown as ReturnType<typeof useForm<EndpointSliceSchema>>[1]
              }
              defaultValues={formattedValues?.ports}
            />
          </CardContent>
          <CardFooter className="flex justify-between gap-2">
            {isEdit ? (
              <Button type="button" variant="destructive" disabled={isPending}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex justify-end gap-2">
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
            </div>
          </CardFooter>
        </Form>
      </FormProvider>
    </Card>
  )
}
