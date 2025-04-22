import { CodeEditorTabs } from '@/components/code-editor/code-editor-tabs'
import { EditorLanguage } from '@/components/code-editor/code-editor.types'
import { Field } from '@/components/field/field'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { IGatewayControlResponse } from '@/resources/interfaces/gateway.interface'
import { updateGatewaySchema, gatewaySchema } from '@/resources/schemas/gateway.schema'
import { jsonToYaml } from '@/utils/editor'
import { getFormProps, useForm, useInputControl } from '@conform-to/react'
import { getZodConstraint, parseWithZod } from '@conform-to/zod'
import { InfoIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Form, useNavigate } from 'react-router'
import { AuthenticityTokenInput } from 'remix-utils/csrf/react'

export const GatewayForm = ({
  defaultValue,
}: {
  defaultValue?: IGatewayControlResponse
}) => {
  const isPending = useIsPending()
  const navigate = useNavigate()

  const [form, fields] = useForm({
    constraint: getZodConstraint(defaultValue ? updateGatewaySchema : gatewaySchema),
    shouldValidate: 'onInput',
    shouldRevalidate: 'onInput',
    onValidate({ formData }) {
      return parseWithZod(formData, {
        schema: defaultValue ? updateGatewaySchema : gatewaySchema,
      })
    },
    defaultValue: {
      content: '',
      format: 'yaml',
    },
  })

  const [hasData, setHasData] = useState<boolean>(true)
  const isEdit = useMemo(() => defaultValue?.uid !== undefined, [defaultValue])

  const formatControl = useInputControl(fields.format)
  const valueControl = useInputControl(fields.content)

  useEffect(() => {
    if (defaultValue) {
      const { spec } = Object.fromEntries(
        Object.entries(defaultValue).filter(([key]) => key === 'spec'),
      )

      setHasData(true)
      form.update({
        value: {
          content: spec ? jsonToYaml(JSON.stringify(spec)) : '',
          format: 'yaml',
        },
      })
    }
  }, [defaultValue])

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? 'Update' : 'Create a new'} gateway</CardTitle>
        <CardDescription>
          {isEdit
            ? 'Update the gateway with the new values below.'
            : 'Create a new gateway to get started with Datum Cloud.'}
        </CardDescription>
      </CardHeader>
      <Form
        method="POST"
        autoComplete="off"
        {...getFormProps(form)}
        className="flex flex-col gap-6">
        <AuthenticityTokenInput />

        {isEdit && (
          <input
            type="hidden"
            name="resourceVersion"
            value={defaultValue?.resourceVersion}
          />
        )}

        <CardContent className="space-y-4">
          {hasData ? (
            <Field
              isRequired
              label={isEdit ? 'Data' : 'Configuration'}
              errors={fields.content.errors}>
              <CodeEditorTabs
                error={fields.content.errors?.[0]}
                value={fields.content.value ?? ''}
                onChange={(newValue, format) => {
                  valueControl.change(newValue)
                  formatControl.change(format as string)
                }}
                format={fields.format.value as EditorLanguage}
                onFormatChange={(format: EditorLanguage) => {
                  formatControl.change(format as string)
                }}
                name="configuration"
                minHeight="300px"
              />
            </Field>
          ) : (
            <Alert variant="secondary">
              <InfoIcon className="size-4" />
              <AlertTitle>Information</AlertTitle>
              <AlertDescription>This gateway does not have any spec.</AlertDescription>
            </Alert>
          )}
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
          {hasData && (
            <Button
              variant="default"
              type="submit"
              disabled={isPending}
              isLoading={isPending}>
              {isPending
                ? `${isEdit ? 'Saving' : 'Creating'}`
                : `${isEdit ? 'Save' : 'Create'}`}
            </Button>
          )}
        </CardFooter>
      </Form>
    </Card>
  )
}
