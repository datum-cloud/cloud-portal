import { Field } from '@/components/field/field'
import { MetadataForm } from '@/components/metadata/metadata-form'
import { SelectGateways } from '@/components/select-gateways/select-gateways'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { IHttpRouteControlResponse } from '@/resources/interfaces/http-route.interface'
import { HttpRouteSchema, httpRouteSchema } from '@/resources/schemas/httproute.schema'
import { MetadataSchema } from '@/resources/schemas/metadata.schema'
import { FormProvider, getFormProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useMemo, useState } from 'react'
import { Form } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const HttpRouteForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string
  defaultValue?: IHttpRouteControlResponse
}) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [formattedValues, setFormattedValues] = useState<HttpRouteSchema>()
  const [form, fields] = useForm({
    id: 'http-route-form',
    constraint: getZodConstraint(httpRouteSchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, { schema: httpRouteSchema })
    },
  })

  const parentRefsControl = useInputControl(fields.parentRefs)

  const isEdit = useMemo(() => {
    return defaultValue?.uid !== undefined
  }, [defaultValue])

  return (
    <Card className="relative">
      <CardHeader>
        <CardTitle>Create a new HTTP route</CardTitle>
        <CardDescription>
          Create a new HTTP route to get started with Datum Cloud.
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
              defaultValues={
                {
                  name: formattedValues?.name,
                  labels: formattedValues?.labels,
                  annotations: formattedValues?.annotations,
                } as MetadataSchema
              }
              isEdit={isEdit}
            />

            <Field label="Gateways" errors={fields.parentRefs.errors}>
              <SelectGateways
                projectId={projectId}
                defaultValue={formattedValues?.parentRefs}
                onChange={(value) => parentRefsControl.change(value)}
              />
            </Field>
          </CardContent>
        </Form>
      </FormProvider>
    </Card>
  )
}
