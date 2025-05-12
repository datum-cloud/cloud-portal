import { SelectAddressType } from './select-address-type'
import { Field } from '@/components/field/field'
import { MetadataForm } from '@/components/metadata/metadata-form'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { Form } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const EndpointSliceForm = ({
  defaultValue,
}: {
  defaultValue?: IEndpointSliceControlResponse
}) => {
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
          <CardContent>
            <MetadataForm
              fields={fields as unknown as ReturnType<typeof useForm<MetadataSchema>>[1]}
              defaultValues={
                {
                  name: formattedValues?.name,
                  labels: formattedValues?.labels,
                  annotations: formattedValues?.annotations,
                } as MetadataSchema
              }
              isEdit={isEdit}
            />
            <Field label="Address Type" errors={fields.addressType.errors}>
              <SelectAddressType meta={fields.addressType} />
            </Field>
          </CardContent>
        </Form>
      </FormProvider>
    </Card>
  )
}
