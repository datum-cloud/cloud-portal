import { RulesForm } from './rule/rules-form'
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
import { SelectGateways } from '@/features/connect/http-route/select-gateways'
import { useIsPending } from '@/hooks/useIsPending'
import { IHttpRouteControlResponse } from '@/resources/interfaces/http-route.interface'
import { HttpRouteSchema, httpRouteSchema } from '@/resources/schemas/http-route.schema'
import { MetadataSchema } from '@/resources/schemas/metadata.schema'
import {
  FieldMetadata,
  FormProvider,
  getFormProps,
  useForm,
  useInputControl,
} from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { useMemo, useState } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const HttpRouteForm = ({
  projectId,
  defaultValue,
}: {
  projectId?: string
  defaultValue?: IHttpRouteControlResponse
}) => {
  const navigate = useNavigate()
  const isPending = useIsPending()

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

  const parentRefsControl = useInputControl(
    fields.parentRefs as unknown as FieldMetadata<string[]>,
  )

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
              defaultValues={formattedValues as MetadataSchema}
              isEdit={isEdit}
            />

            <Field isRequired label="Gateways" errors={fields.parentRefs.errors}>
              <SelectGateways
                projectId={projectId}
                defaultValue={formattedValues?.parentRefs}
                onChange={(value) => parentRefsControl.change(value)}
              />
            </Field>

            <RulesForm
              fields={fields as unknown as ReturnType<typeof useForm<HttpRouteSchema>>[1]}
              defaultValues={formattedValues?.rules}
              projectId={projectId}
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
